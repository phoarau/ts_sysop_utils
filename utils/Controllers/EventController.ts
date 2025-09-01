import DataTable, { Api, ConfigLanguage } from "datatables.net-bs5";
import language from "datatables.net-plugins/i18n/fr-FR";
import { formatDateTime } from "../FormatUtils";
import dayjs from "dayjs";
import { Popover } from "bootstrap";
import { Event } from "../../model/Event";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

export class EventController {
    table: Api<Event>;
    tableId: string;
    activePopover: Popover | null = null;
    modalId: string;

    constructor({ tableId, modalId }: { tableId: string; modalId: string }) {
        this.tableId = tableId;
        this.modalId = modalId;
        this.table = new DataTable<Event>(this.tableId, {
            dom: "t",
            language: language as ConfigLanguage,
            destroy: true,
            columns: [
                {
                    data: "date",
                    render: (data: string) => formatDateTime(dayjs(data), "DD/MM/YYYY HH:mm", "-"),
                },
                {
                    data: "type",
                    render: (data: string, _type, row: Event) => {
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
                    if (this.activePopover) {
                        this.activePopover.hide();
                    }
                    this.activePopover = Popover.getOrCreateInstance(e.currentTarget as HTMLElement);
                }),
            );
            const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const popoverList = [...popoverTriggerList].map(
                (popoverTriggerEl) =>
                    new Popover(popoverTriggerEl, {
                        container: $(this.modalId)[0],
                        html: true,
                        customClass: "popover-white popover-map",
                        trigger: "hover focus",
                        content: () => {
                            const dirtyFields = JSON.parse($(popoverTriggerEl).attr("data-dirty-fields")!);
                            const table = $("<table>").addClass("table table-bordered");
                            for (const key in dirtyFields) {
                                const value = dirtyFields[key];
                                table.append(
                                    $("<tr>")
                                        .append($("<th>").html(key))
                                        .append($("<td>").html(this.formatFieldValue(value, key))),
                                );
                            }
                            return table;
                        },
                    }),
            );
        });
    }

    draw(events: Event[]) {
        this.table.clear().rows.add(events).draw();
    }

    private isDate(value?: unknown) {
        const dateRegexp = /(\d{4})-(\d{2})-(\d{2})/;
        return dateRegexp.test(value?.toString() ?? "");
    }

    protected formatFieldValue(value: string, field: string) {
        return this.isDate(value)
            ? this.formatDateField(value as string, field, "DD/MM/YYYY HH:mm")
            : (value?.toString() ?? "");
    }

    private formatDateField(value: string, field: string, format: string = "YYYY-MM-DD HH:mm") {
        // if (field.includes(".date")) {
        //     format = "DD/MM/YYYY";
        // } else if (field.includes(".heure")) {
        //     format = "HH:mm";
        // }
        return dayjs.utc(value?.toString()).format(format);
    }
}
