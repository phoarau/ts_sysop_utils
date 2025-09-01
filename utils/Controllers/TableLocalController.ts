import { Api } from "datatables.net-bs5";
import { Modal } from "bootstrap";
import { LocalController } from "./LocalController";

type Props<T> = { hidden_field_container_id: string; formId: string; modalId: string; table: Api<T> };

export abstract class TableLocalController<T, F> extends LocalController<T, F> {
    item: T | null;
    table: Api<T>;
    modalId: string;
    modal: Modal;
    form: JQuery<HTMLFormElement>;

    constructor({ hidden_field_container_id, table, modalId, formId }: Props<T>) {
        super(hidden_field_container_id);
        this.table = table;
        this.modalId = modalId;
        this.modal = Modal.getOrCreateInstance(modalId);
        this.form = $(formId);
    }

    new(parentItem: F | null) {
        super.baseNew(parentItem);
        this.item = null;
        $(this.modalId).find(".btn-delete").hide();
        this.modal.show();
    }

    async edit(row: number, parentItem: F) {
        super.baseEdit(row, parentItem);
        this.item = this.rows[row];
        $(this.modalId).find(".btn-delete").show();
        this.modal.show();
    }

    async save() {
        const validator = this.form.validate({});

        if (!validator.form()) {
            console.warn("Formulaire invalide");
            return;
        }

        super.baseSave(this.buildItemFromForm());
        this.drawTable(this.rows);

        this.modal.hide();
    }

    delete(row: number, title: string, content: string, onConfirm?: (item: T) => void) {
        super.baseDelete(row, title, content, (item: T) => {
            if (onConfirm) {
                onConfirm(item);
            }

            this.drawTable(this.rows);
            this.modal.hide();
        });
    }

    protected baseAttachEvents(): void | Promise<void> {
        document.querySelector(this.modalId)?.addEventListener(
            "hide.bs.modal",
            () => {
                this.baseDetachEvents();
            },
            { once: true },
        );
        this.attachEvents();
    }

    protected baseDetachEvents(): void | Promise<void> {
        this.detachEvents();
    }

    /**
     * Re dessine le tableau datatable avec les données en paramètre
     */
    private drawTable(items: T[]): void {
        this.table.clear();
        this.table.rows.add(items);
        this.table.draw();
    }

    /**
     * Attribue les données <values> au controller (utilisé pour l'enregistrement et l'affichage)
     */
    public setValues(values: T[]): void {
        this.rows = values;
        this.drawTable(values);
        this.baseBuildInputs(values);
    }

    protected abstract attachEvents(): void | Promise<void>;
    protected abstract detachEvents(): void | Promise<void>;
}
