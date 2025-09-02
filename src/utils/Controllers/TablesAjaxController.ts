import { Modal } from "bootstrap";
import { Api } from "datatables.net";
import { AjaxControllerProps } from "./AjaxController";
import { TableAjaxController, TableAjaxProps } from "./TableAjaxController";

export type TableConfig<T, Status> = {
    /**
     * Le nom de l'onglet
     */
    name: string;
    // id: string;
    config: {
        data: { status: Status[] } & Record<string, unknown>;
        /**
         * Classe complète du badge (pour le bg par exemple: "bg-primary")
         */
        badge: string | boolean;
        // isVisible?: (field: keyof T) => boolean;
        invisibleFields?: (keyof T)[];
    };
};

type TablesConfigMap<T, Keys> = Map<Keys, TableConfig<T, Keys>>;

export type TablesAjaxProps<T, K, ActionName> = {
    tables?: TablesConfigMap<T, K>;
    tabId?: string;
    activeTab: K;
    generalDisplayOptions?: {
        titlesDisplayClass?: string;
        badgeAdditionalClasses?: string;
    };
} & TableAjaxProps<T, ActionName, K>;

export abstract class TablesAjaxController<
    T extends { id: number | string },
    TabNames extends string = string,
    ActionName extends string = string,
> extends TableAjaxController<T, number | string> {
    tables?: TablesConfigMap<T, TabNames>;
    tabId?: string;
    activeTab: TabNames;

    constructor(private props: TablesAjaxProps<T, TabNames, ActionName> & AjaxControllerProps) {
        super({ ...props });

        this.table = props.table;
        this.tables = props.tables;
        this.tabId = props.tabId;
        this.activeTab = props.activeTab;
    }

    protected buildTabs() {
        const divTabs = $(this.tabId!);
        const navTab = $("<nav>").addClass("nav nav-underline").attr("role", "tablist");
        navTab.empty();
        this.tables?.forEach((v, k) => {
            const t = $("<span>")
                .addClass(this.props.generalDisplayOptions?.titlesDisplayClass ?? "display-5")
                .text(v.name);
            if (v.config.badge) {
                t.append(
                    $("<span>")
                        .addClass(
                            `badge ${v.config.badge} ${this.props.generalDisplayOptions?.badgeAdditionalClasses} ms-1`,
                        )
                        .text(0),
                );
            }

            const a = $("<button>")
                .append(t)
                .attr("data-tab", k)
                .addClass("nav-item nav-link px-2 border-end")
                .addClass(this.activeTab == k ? " active" : "")
                .attr("data-bs-toggle", "tab")
                .attr("aria-selected", "false");

            navTab.append(a);
        });
        divTabs.append(navTab);

        $(this.tabId!)
            .find(".nav-item")
            .on("click", (event) => {
                const tabName = $(event.currentTarget).data("tab");
                this.setTable(tabName);
            });

        this.setTable(this.activeTab);
    }

    reloadTables() {
        this.table?.ajax.reload();
    }

    protected async populateBadges(metadata: Record<string, number>) {
        const badges = new Map<TabNames, number>();

        this.tables?.forEach((v, k) => {
            if (!badges.get(k as TabNames)) {
                badges.set(k as TabNames, 0);
            }
            const statuses = v.config.data["status"];
            if (Array.isArray(statuses)) {
                statuses.forEach((key) => {
                    if (metadata?.[key]) {
                        badges.set(k as TabNames, badges.get(k as TabNames)! + metadata[key]);
                    }
                });
            }
        });

        badges.forEach((v, k) => {
            const badge = $(`${this.tabId} .nav-item[data-tab="${k}"] .badge`);
            badge.text(v);
        });
    }

    async save(
        form?: JQuery<HTMLFormElement>,
        modal?: Modal,
        table?: Api<T> | undefined,
        options?: { action?: string; extension?: "gz" | "json" },
    ) {
        const response = await super.save(form, modal, table, options);
        this.reloadTables();
        return response;
    }

    protected setTable(key: TabNames) {
        this.activeTab = key;
        this.table?.ajax.reload();
        this.updateColumnsVisibility();
    }

    protected updateColumnsVisibility() {
        const columnIndexes: number[] = this.table?.columns()[0] ?? [];

        for (const columnIndex of columnIndexes) {
            const column = this.table?.column(columnIndex);
            const columnName = column?.dataSrc() as keyof T;
            const config = this.tables?.get(this.activeTab)?.config;
            const invisibleFields = config?.invisibleFields ?? [];
            const isVisible = !invisibleFields.includes(columnName);
            column?.visible(isVisible);
        }
    }

    protected initEvents() {}
}
