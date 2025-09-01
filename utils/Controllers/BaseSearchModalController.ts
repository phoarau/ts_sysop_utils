import { Modal } from "bootstrap";

export type BaseSearchModalPropsOverrides<T> = {
    getItemId?: (item: T | null | undefined) => string | null | undefined;
    getItemName?: (item: T | null | undefined) => string | null | undefined;
};

type Props<T> = {
    modalId: string;
    nameTargetId?: string;
    idTargetId?: string;
    onSelect?: (node: T | null | undefined) => void | Promise<void>;
    beforeSelect?: (node: T | null | undefined) => boolean | Promise<boolean>;
    afterSelect?: (node: T | null | undefined) => void | Promise<void>;
    overrides?: BaseSearchModalPropsOverrides<T>;
};

export abstract class BaseSearchModalController<
    T extends { id?: number; name?: string; path?: string | { path?: string }; data?: { type: string } },
> {
    modalId: string;
    modal: Modal;
    nameTargetId?: string;
    nameTarget?: JQuery<HTMLInputElement>;
    idTargetId?: string;
    idTarget?: JQuery<HTMLInputElement>;
    onSelect?: (node: T | null | undefined) => void | Promise<void>;
    beforeSelect?: (node: T | null | undefined) => boolean | Promise<boolean>;
    afterSelect?: (node: T | null | undefined) => void | Promise<void>;
    selectedItem: T | null | undefined = null;
    protected overrides?: BaseSearchModalPropsOverrides<T>;

    constructor({ modalId, nameTargetId, idTargetId, onSelect, beforeSelect, afterSelect, overrides }: Props<T>) {
        this.idTargetId = idTargetId;
        if (idTargetId) {
            this.idTarget = $(idTargetId);
        }

        this.nameTargetId = nameTargetId;
        if (nameTargetId) {
            this.nameTarget = $(nameTargetId);
        }

        this.overrides = overrides;

        this.onSelect = onSelect;
        this.beforeSelect = beforeSelect;
        this.afterSelect = afterSelect;
        this.modalId = modalId;
        this.modal = Modal.getOrCreateInstance(modalId);
    }

    abstract reload(): Promise<void>;
    public async select(item: T | null | undefined, close: boolean = true): Promise<void> {
        const canSelect = (await this.beforeSelect?.(item)) ?? true;

        if (!canSelect) {
            return;
        }

        this.selectedItem = item;
        this.idTarget?.val(this.getItemId(item));
        this.nameTarget?.val(this.getItemName(item)).trigger("keyup");

        await this.onSelect?.(item);

        if (close) {
            this.modal.hide();
        }

        await this.afterSelect?.(item);
    }

    protected abstract attachEvents(): Promise<void>;
    protected abstract detachEvents(): Promise<void>;
    protected async onOpen(): Promise<void> {
        // console.warn("Méthode onOpen() non override");
        return;
    }

    protected getItemId(item: T | null | undefined): string {
        return this.overrides?.getItemId?.(item) ?? item?.id?.toString() ?? "";
    }

    protected getItemName(item: T | null | undefined): string {
        return this.overrides?.getItemName?.(item) ?? item?.path?.toString() ?? item?.name?.toString() ?? "";
    }

    public async open(selectedItem: T | null | undefined = this.selectedItem): Promise<void> {
        this.selectedItem = selectedItem ?? this.selectedItem;
        await this.onOpen();
        await this.attachEvents();
        this.modal.show();
        await this.reload();
    }
}
