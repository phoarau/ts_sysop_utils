import { Api } from "datatables.net-bs5";
import "datatables.net-rowgroup-bs5";

type RowGroupDataSource<T> = string | string[] | ((item: T) => string) | ((item: T) => string)[];

export class CollapsableRowgroup<T> {
    dataSrc: RowGroupDataSource<T>;
    collapsedGroups: Map<number, Map<string, boolean>>;
    defaultCollapsedGroups: boolean = true;
    groupTitleColspan: number;
    groupRender: ((tr: JQuery<HTMLElement>, rows, level: number | undefined) => JQuery<HTMLElement>) | null = null;
    simpleCollapse?: boolean;

    constructor(
        dataSrc: RowGroupDataSource<T>,
        defaultCollapsedGroups: boolean = true,
        groupTitleColspan: number = 20,
        groupRender: ((tr: JQuery<HTMLElement>, rows, level: number | undefined) => JQuery<HTMLElement>) | null = null,
        simpleCollapse: boolean = false,
    ) {
        this.dataSrc = dataSrc;
        this.defaultCollapsedGroups = defaultCollapsedGroups;
        this.groupTitleColspan = groupTitleColspan;
        this.groupRender = groupRender;
        this.simpleCollapse = simpleCollapse;
        this.collapsedGroups = new Map();
    }

    getRowGroup() {
        const configRowGroup = {
            dataSrc: this.dataSrc,
            startRender: (rows, group, level) => {
                const gp = level + "_" + group;

                const collapsed =
                    typeof this.collapsedGroups.get(level)?.get(gp) == "undefined"
                        ? this.defaultCollapsedGroups
                        : this.collapsedGroups.get(level)?.get(gp);

                let hasGroup = true;
                if (group === "No group") {
                    hasGroup = false;
                }
                const groupDisplay = hasGroup ? group : "Aucun groupe";

                if (level == this.dataSrc.length - 1) {
                    // C'est le dernier niveau, on gère l'affichage les lignes
                    rows.nodes().each(function (r) {
                        r.style.display = collapsed ? "none" : "";
                    });
                }

                let tr = $("<tr/>")
                    .append(
                        $("<th>")
                            .attr("colspan", this.groupTitleColspan)
                            .append($("<i>").addClass("fa fa-" + (collapsed ? "plus" : "minus")))
                            .append(" " + groupDisplay + " (" + rows.data().length + ")"),
                    )
                    .attr("data-level", level)
                    .attr("data-group", gp)
                    .toggleClass("collapsed", collapsed);

                if (this.groupRender) {
                    tr = this.groupRender(tr, rows, level);
                }

                if (level > 0) {
                    const parent_group = this.getRowParentGroup(level, rows.data()[0]);
                    const collapsedParent =
                        typeof this.collapsedGroups.get(level - 1)?.get(parent_group) == "undefined"
                            ? this.defaultCollapsedGroups
                            : this.collapsedGroups.get(level - 1)?.get(parent_group);

                    tr.toggleClass("d-none", collapsedParent);

                    if (collapsedParent) {
                        // C'est le dernier niveau, on gère l'affichage les lignes
                        rows.nodes().each(function (r) {
                            r.style.display = "none";
                        });
                    }
                }

                return tr;
            },
        };

        return configRowGroup;
    }

    getRowParentGroup(level, data0) {
        if (typeof this.dataSrc[level - 1] == "function") {
            return level - 1 + "_" + this.dataSrc[level - 1](data0);
        }

        const path = this.dataSrc[level - 1].split(".");

        path.forEach((p) => {
            if (data0[p] === undefined) {
                return "";
            }
            data0 = data0[p];
        });
        return level - 1 + "_" + data0;
    }

    /**
     * Initialize the collapse events for the row groups in the DataTable.
     * @param table The DataTable instance.
     * @param evt Optional event handlers for collapse and expand actions.
     * @returns The CollapsableRowgroup instance for chaining.
     */
    initCollapseEvents(
        table: Api,
        evt?: { onCollapse?: () => void; onExpand?: (tr: JQuery<HTMLElement>) => void },
    ): CollapsableRowgroup<T> {
        table.on("click", "tr.dtrg-group.dtrg-start", (event) => {
            const tr = $(event.currentTarget as HTMLElement);
            const collapse = this.toggle(tr);

            if (collapse) {
                evt?.onCollapse?.();
            } else {
                evt?.onExpand?.(tr);
            }

            table.draw();
        });

        return this;
    }

    unregisterEvents(table: Api): void {
        table?.off("click", "tr.dtrg-group.dtrg-start");
    }

    toggleCollapseAll() {
        this.defaultCollapsedGroups = !this.defaultCollapsedGroups;
        this.collapsedGroups = new Map();

        // this.collapsedGroups.forEach((groupMap, level) => {
        //     groupMap.forEach((collapsed, group) => {
        //         console.log("Toggling group:", group, "at level:", level, "from collapsed:", collapsed);
        //         groupMap.set(group, !collapsed);
        //     });
        // });

        // Update the icons in the table
        // const table = $("table.dataTable");
        // table.find("tr.dtrg-group.dtrg-start").each((_, tr) => {
        //     const $tr = $(tr);
        //     const icon = $tr.find("i");
        //     const group = $tr.data("group");
        //     const level = parseInt($tr.data("level"));

        //     if (this.collapsedGroups.get(level)?.get(group)) {
        //         icon.removeClass("fa-minus").addClass("fa-plus");
        //     } else {
        //         icon.removeClass("fa-plus").addClass("fa-minus");
        //     }
        // });
    }

    private toggle(tr: JQuery<HTMLElement>): boolean {
        const group = tr.data("group");
        const level = parseInt(tr.data("level"));

        if (!this.collapsedGroups.get(level)) {
            this.collapsedGroups.set(level, new Map());
        }

        const collapse = this.collapsedGroups.get(level)?.get(group) ?? this.defaultCollapsedGroups;

        if (this.simpleCollapse) {
            this.collapsedGroups = new Map();
        }

        this.collapsedGroups.get(level)?.set(group, !collapse);
        const icon = tr.find("i");

        icon.toggleClass("fa-minus", collapse);
        icon.toggleClass("fa-plus", !collapse);
        return collapse;
    }
}
