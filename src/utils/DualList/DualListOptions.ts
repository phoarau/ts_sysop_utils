import { Config } from "datatables.net-bs5";

export type DualListOptions<T> = {
    dataType?: "ids" | "object";
    object?: Array<ObjectDescription<T>>;
    keepOrder?: boolean;
    selectedElements?: Array<T>;
    tablesClasses?: string;
    options?: TablesTitles;
    onChange?: (selectedElements: Array<T>, unselectedElements: Array<T>) => void;
    afterChange?: (selectedElements: Array<T>, unselectedElements: Array<T>) => void | Promise<void>;
    dataTableOptions?: Config;
    cellRender?: (data: T) => string /** Html */;
    fields?: fieFieldOptions;
    data?: Array<T>;
    ajax?: AjaxOptions<T>;
    title?: string;
    showMoveAllButtons?: boolean;
};

export type ObjectDescription<T> = {
    name: string;
    value: ((item: T, index: number) => string) | string;
};

export type TablesTitles = {
    unselectedTableTitle: string;
    selectedTableTitle: string;
};

export type fieFieldOptions = {
    libelle: string;
    group?: string;
    value: string;
};

export type AjaxOptions<T> = {
    url: () => string | string;
    data?: object;
    source?: string;
    dataFormatter?: (data: string, type: string) => T[];
};
