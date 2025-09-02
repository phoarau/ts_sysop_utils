import { Api } from "datatables.net-bs5";
import { BaseSearchModalController, BaseSearchModalPropsOverrides } from "./BaseSearchModalController";
import { sysopEndLoader, sysopStartLoader } from "../commonUtils";

export type TableSearchAjaxProps = {
    url: string;
    data?: () => object;
    dataSrc?: string | null;
    loaderTargetId?: string | null;
};

type Props<T> = {
    modalId: string;
    table?: Api<T>;
    nameTargetId?: string;
    idTargetId?: string;
    onSelect?: (item: T | null | undefined) => void;
    tableSearchAjaxProps?: TableSearchAjaxProps | null;
    overrides?: BaseSearchModalPropsOverrides<T>;
};

export abstract class TableSearchModalController<
    T extends { id: number; name?: string },
> extends BaseSearchModalController<T> {
    table?: Api<T>;
    tableSearchAjaxProps?: TableSearchAjaxProps | null;

    constructor(props: Props<T>) {
        super({ ...props });

        this.table = props.table;
        this.tableSearchAjaxProps = props.tableSearchAjaxProps;
    }

    async reload(): Promise<void> {
        if (!this.tableSearchAjaxProps) {
            this.table?.ajax.reload();
        } else {
            if (this.tableSearchAjaxProps?.loaderTargetId) {
                sysopStartLoader(this.tableSearchAjaxProps?.loaderTargetId);
            }
            const items = await this.fetchData(this.tableSearchAjaxProps);
            this.table?.clear();
            this.table?.rows.add(items);
            this.table?.draw();

            if (this.tableSearchAjaxProps?.loaderTargetId) {
                sysopEndLoader(this.tableSearchAjaxProps?.loaderTargetId);
            }
        }
    }

    protected async attachEvents(): Promise<void> {
        this.table?.on("dblclick", "tr", (e: Event) => {
            const rowData = this.table?.row(e.currentTarget as HTMLElement).data();
            if (!rowData) {
                console.warn("Impossible de récupérer la donnée sélectionnée", rowData);
                return;
            }
            this.select(rowData);
            //this.nameTarget?.trigger("keyup");
            this.modal.hide();
        });

        document.querySelector(this.modalId)?.addEventListener(
            "hide.bs.modal",
            () => {
                this.detachEvents();
            },
            { once: true },
        );
    }

    protected async detachEvents(): Promise<void> {
        this.table?.off("dblclick", "tr");
    }

    private async fetchData(ajaxProps: TableSearchAjaxProps): Promise<T[]> {
        const items = await $.ajax({
            url: ajaxProps.url,
            type: "GET",
            data: ajaxProps.data != null ? ajaxProps.data!() : {},
            dataType: "json",
        });

        if (ajaxProps.dataSrc != null) {
            return items[ajaxProps.dataSrc];
        } else {
            return items;
        }
    }
}
