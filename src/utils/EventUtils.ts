import DataTable from "datatables.net-bs5";
//@ts-expect-error c'est datatables
import language from "datatables.net-plugins/i18n/fr-FR";
import { formatDateTime } from "./FormatUtils";
import dayjs from "dayjs";
import { Popover } from "bootstrap";
import { Event } from "../model/Event";

let activePopover: Popover | null = null;

export function initEventsDataTable(id: string, modalId: string) {
    return new DataTable<Event>(id, {
        dom: "t",
        language,
        destroy: true,
        columns: [
            {
                data: "date",
                render: (data: string) => formatDateTime(dayjs(data), "DD/MM/YYYY HH:mm", "-"),
            },
            {
                data: "type",
                render: (data: string, type, row: Event) => {
                    return $("<button>")
                        .addClass("btn btn-sm btn-outline-secondary w-100")
                        .attr("data-bs-toggle", "popover")
                        .attr("data-bs-title", "Champs")
                        .attr("data-dirty-fields", JSON.stringify(row.dirty))
                        .html(data)[0].outerHTML;
                },
            },
            {
                data: "dirty",
                visible: false,
            },
            {
                data: "utilisateur",
            },
        ],
    }).on("draw", () => {
        document.querySelectorAll('[data-bs-toggle="popover"]').forEach((element) =>
            element.addEventListener("show.bs.popover", (e) => {
                if (activePopover) {
                    activePopover.hide();
                }
                activePopover = Popover.getOrCreateInstance(e.currentTarget as HTMLElement);
            }),
        );
        const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const popoverList = [...popoverTriggerList].map(
            (popoverTriggerEl) =>
                new Popover(popoverTriggerEl, {
                    container: $(modalId)[0],
                    html: true,
                    customClass: "popover-white popover-map",
                    trigger: "hover focus",
                    content() {
                        const dirtyFields = JSON.parse($(popoverTriggerEl).attr("data-dirty-fields")!);
                        const table = $("<table>").addClass("table table-bordered");
                        for (const key in dirtyFields) {
                            const value = dirtyFields[key];
                            table.append($("<tr>").append($("<th>").html(key)).append($("<td>").html(value)));
                        }
                        return table;
                    },
                }),
        );
    });
}
