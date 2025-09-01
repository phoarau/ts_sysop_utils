import { Modal } from "bootstrap";
import { Api } from "datatables.net-bs5";
import { nl2br } from "../FormatUtils";
import { CustomCakeResponse } from "../Types";
import { AjaxController, AjaxControllerProps } from "./AjaxController";
import { BaseControllerProps } from "./BaseController";

export type TableAjaxProps<T, ActionName = string, ItemStatus = string> = {
    table?: Api<T>;
    modalId: string;
    viewModalId?: string;
    actions?: ActionsConfigMap<ActionName, ItemStatus, T>;
} & BaseControllerProps;

export type ActionConfig<Status, T> = {
    action?: (e: EventTarget) => void;
    statusAvailable: Status[];
    button?: HTMLElement | null;
} & (
    | {
          extraCondition: (item: T | null | undefined) => boolean | Promise<boolean>;
          /**
           * Le type de condition à appliquer avec le check sur le status
           * - "AND" : le status doit être valide ET la condition doit être vraie
           * - "OR" : le status doit être valide OU la condition doit être vraie
           *
           * Par défaut, si non précisé, c'est traité comme "AND"
           */
          conditionType?: "AND" | "OR";
      }
    | {
          extraCondition?: never;
          conditionType?: never;
      }
);

type ActionsConfigMap<Keys, Statuses, T> = Map<Keys, ActionConfig<Statuses, T>>;

export abstract class TableAjaxController<
    T extends { id: E; status?: string },
    E = number | string | null | undefined,
    ActionName extends string = string,
    ItemStatus extends string = string,
> extends AjaxController<T, E> {
    table?: Api<T>;
    modalId: string;
    modal: Modal;
    viewModalId?: string;
    viewModal?: Modal;
    actions: ActionsConfigMap<ActionName, ItemStatus, T>;

    constructor({
        table,
        modalId,
        viewModalId,
        formId,
        url,
        actions,
    }: TableAjaxProps<T, ActionName, ItemStatus> & AjaxControllerProps) {
        super({ formId, url });
        this.table = table;
        this.modalId = modalId;
        this.modal = Modal.getOrCreateInstance(modalId);
        this.viewModalId = viewModalId;
        this.viewModal = viewModalId ? Modal.getOrCreateInstance(viewModalId) : undefined;
        this.actions = actions ?? new Map<ActionName, ActionConfig<ItemStatus, T>>();
    }

    async view(id: E) {
        if (!this.viewModalId) {
            console.warn("Modale de vue non définie");
            return;
        }
        await this.baseView(id, {});
        // $(this.viewModalId).find(".btn-delete").show();
        this.viewModal?.show();
    }

    async new() {
        this.viewModal?.hide();
        await this.baseNew();
        $(this.modalId).find(".btn-delete").hide();
        this.modal.show();
    }

    async edit(id: E, options: { modalId?: string; formId?: string } = {}) {
        this.viewModal?.hide();

        if (options.modalId && typeof options.modalId === "string") {
            this.modalId = options.modalId;
            this.modal = Modal.getOrCreateInstance(this.modalId);
        }

        if (options.formId && typeof options.formId === "string") {
            this.formId = options.formId;
            this.form = $(this.formId);
        }

        const item = await this.baseEdit(id, {});
        $(this.modalId).find(".btn-delete").show();
        this.modal.show();
        return item;
    }

    /**
     *
     * @param form Le formulaire qui contient les données à envoyer
     * @param modal La modale à cacher après l'enregistrement
     * @param table Le tableau à recharger après l'enregistrement
     * @returns
     */
    async save(
        form: JQuery<HTMLFormElement> = this.form,
        modal: Modal = this.modal,
        table: Api<T> | undefined = this.table,
        options: { action?: string; extension?: "gz" | "json" } = {},
    ) {
        const data = new FormData(form[0]);
        const validator = form.validate({});

        if (!validator.form()) {
            console.warn("Formulaire invalide");
            return;
        }

        const response: CustomCakeResponse<T> = await this.baseSave(data, options);

        if (response.status === 0) {
            modal.hide();
            if (table?.ajax?.url()) {
                table?.ajax?.reload();
            }
        }

        return response;
    }

    delete(id: E | undefined = this.item?.id) {
        return this.baseDelete(id, {
            onConfirm: async () => {
                this.table?.ajax.reload();
                this.modal?.hide();
                this.viewModal?.hide();
            },
        });
    }

    protected baseAttachEvents(): void | Promise<void> {
        if (this.modalId) {
            document.querySelector(this.modalId)?.addEventListener(
                "hide.bs.modal",
                () => {
                    this.baseDetachEvents();
                },
                { once: true },
            );
        }
        if (this.viewModalId) {
            document.querySelector(this.viewModalId)?.addEventListener(
                "hide.bs.modal",
                () => {
                    this.baseDetachEvents();
                },
                { once: true },
            );
        }
        return this.attachEvents();
    }

    protected baseDetachEvents(): void | Promise<void> {
        return this.detachEvents();
    }

    /**
     * Par défaut cette fonction ajoute les événements sur les boutons `edit`, `save` et `delete` contenus dans les modales
     */
    protected attachEvents(): void | Promise<void> {
        if (this.modalId) {
            $(this.modalId)
                .find(".modal-footer")
                .find(".btn-save")
                .on("click", () => this.save());
            $(this.modalId)
                .find(".modal-footer")
                .find(".btn-delete")
                .on("click", () => {
                    if (!this.item?.id) {
                        console.warn("Impossible de récupérer l'item", this.item);
                        return;
                    }
                    return this.delete(this.item.id);
                });
        }
        if (this.viewModalId) {
            $(this.viewModalId)
                .find(".modal-footer")
                .find(".btn-edit")
                .on("click", () => {
                    if (!this.item?.id) {
                        console.warn("Impossible de récupérer l'item", this.item);
                        return;
                    }
                    return this.edit(this.item.id);
                });
            $(this.viewModalId)
                .find(".modal-footer")
                .find(".btn-save")
                .on("click", () => this.save());
            $(this.viewModalId)
                .find(".modal-footer")
                .find(".btn-delete")
                .on("click", () => {
                    if (!this.item?.id) {
                        console.warn("Impossible de récupérer l'item", this.item);
                        return;
                    }
                    return this.delete(this.item.id);
                });
        }
        $(this.viewModalId!)
            .find("[data-action]")
            .on("click", (e) => this.handleAction(e.currentTarget));
    }

    /**
     * Par défaut cette fonction retire les événements des boutons `edit`, `save` et `delete` contenus dans les modales
     */
    protected detachEvents(): void | Promise<void> {
        if (this.modalId) {
            $(this.modalId).find(".btn-edit").off("click");
            $(this.modalId).find(".btn-save").off("click");
            $(this.modalId).find(".btn-delete").off("click");
        }
        if (this.viewModalId) {
            $(this.viewModalId).find(".btn-edit").off("click");
            $(this.viewModalId).find(".btn-save").off("click");
            $(this.viewModalId).find(".btn-delete").off("click");
            $(this.viewModalId).find("[data-action]").off("click");
        }
    }

    protected async fillViewWith(item: T, fallback: string = "") {
        if (this.viewModalId && this.viewModal) {
            const fields = $("[view-field]")
                .toArray()
                .map((e) => $(e).attr("view-field"))
                .filter((field) => field !== null && field != undefined);
            for (const field of fields) {
                $(this.viewModalId)
                    .find(`[view-field="${field}"]`)
                    .html(nl2br(this.formatFieldValue(item, field, "view", fallback)));
            }
            this.updateBtnActionVisibility();
        }
    }

    protected handleAction(target: EventTarget): void {
        const action = $(target).data("action");
        if (this.actions.has(action) && this.actions.get(action)?.action) {
            this.actions.get(action)?.action!(target);
        }
    }

    protected updateBtnActionVisibility(): void {
        $(this.viewModalId!)
            .find(".btn-action")
            .toArray()
            .forEach(async (e) => {
                const actionName = $(e).data("action");
                const action = this.actions.get(actionName);
                const actionIsAvailableForItemStatus = action?.statusAvailable.includes(
                    this.item?.status as ItemStatus,
                );

                let finalCondition = actionIsAvailableForItemStatus;
                const extraCondition = this.actions.get(actionName)?.extraCondition;
                if (extraCondition) {
                    const conditionType = this.actions.get(actionName)?.conditionType ?? "AND";
                    const conditionValue = extraCondition(this.item);
                    switch (conditionType) {
                        case "AND":
                            finalCondition =
                                actionIsAvailableForItemStatus &&
                                (typeof conditionValue === "boolean" ? conditionValue : await conditionValue);
                            break;
                        case "OR":
                            finalCondition =
                                actionIsAvailableForItemStatus ||
                                (typeof conditionValue === "boolean" ? conditionValue : await conditionValue);
                    }
                }

                $(e).toggle(finalCondition);
            });
    }
}
