import { BaseController } from "./BaseController";

/**
 * TODO: Réfléchir au moyen de ne pas avoir la fonction delete pour certains controllers
 */
export abstract class LocalController<T, F> extends BaseController<T> {
    parentItem: F | null = null;
    hidden_field_container_id: string;
    selected_row: number = -1;
    rows: T[] = [];

    constructor(hidden_field_container_id: string) {
        super({ formId: "" });

        this.hidden_field_container_id = hidden_field_container_id;
    }

    baseNew(parentItem: F | null): void {
        this.selected_row = -1;
        this.parentItem = parentItem;
        this.baseAttachEvents();
        this.resetForm();
    }

    baseEdit(row: number, parentItem: F): void {
        this.selected_row = row;
        this.baseAttachEvents();
        this.parentItem = parentItem;

        this.resetForm();
        this.fillFormWith(this.rows[row]);
    }

    baseSave(item: T = this.buildItemFromForm()): void {
        if (this.selected_row === -1) {
            this.rows.push(item);
        } else {
            this.rows[this.selected_row] = item;
        }

        this.baseBuildInputs(this.rows);
    }

    baseDelete(row: number, title: string, content: string, onConfirm: (item: T) => void): void {
        if (row === null) {
            return;
        }

        this.showDeleteConfirm({
            title,
            content,
            onConfirm: (item: T) => {
                this.rows.splice(row, 1);

                this.baseBuildInputs(this.rows);
                onConfirm(item);
            },
        });
    }

    /**
     * Renvoyer un item T a partir du formulaire
     */
    public abstract buildItemFromForm(): T;

    /**
     * Construire les champs cachés d'un item T
     *
     * @param item
     * @param index
     */
    public abstract buildItemHiddenFields(item: T, index: number): string;
    public abstract buildEmptyItemsHiddenField(): string;

    public baseBuildInputs(items: T[]): void {
        const container = $(this.hidden_field_container_id);
        container.empty();

        if (items && items.length > 0) {
            items.forEach((item, index) => {
                container.append(this.buildItemHiddenFields(item, index));
            });
        } else {
            container.append(this.buildEmptyItemsHiddenField());
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async fillViewWith(_item: T): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public resetData(): void {
        this.selected_row = -1;
        this.rows = [];
    }
}
