import { getCsrfToken } from "../AuthUtils";
import { DualListOptions, ObjectDescription } from "./DualListOptions";
import { Api, Config } from "datatables.net-bs5";
//@ts-expect-error tkt c'est datatables
import language from "datatables.net-plugins/i18n/fr-FR";
import "datatables.net-rowgroup-bs5";

export class DualList<T> {
    public params: DualListOptions<T>;
    public dataType: "ids" | "object";
    public object?: ObjectDescription<T>[];
    public keepOrder: boolean;
    public elements: T[] = [];
    public selectedElements: T[];
    public input: JQuery<HTMLElement>;
    public unselectedTableSearch: string = "";
    public selectedTableSearch: string = "";
    public hiddenInputsDiv: JQuery<HTMLElement> | null = null;
    public selectedTable: JQuery<HTMLElement>;
    public unselectedTable: JQuery<HTMLElement>;
    public unselectedDt!: Api<T>;
    public selectedDt!: Api<T>;
    public title: string;
    public showMoveAllButtons: boolean;

    constructor(input: JQuery<HTMLElement>, params: DualListOptions<T>) {
        this.params = params;
        this.dataType = params.dataType ?? "ids";
        this.object = params.object;
        this.input = input;
        this.keepOrder = params.keepOrder ?? false;
        this.selectedElements = [];
        this.title = params.title ?? "";
        this.showMoveAllButtons = params.showMoveAllButtons ?? true;

        // Préparation des blocks
        this.input.css("display", "none");

        if (this.dataType === "object") {
            // let parent = this.input.parent();
            const tempInput = $("<div>")
                .attr("id", this.input.attr("id")?.toString() ?? "")
                .css("display", "none");
            // this.input.remove();
            // parent.prepend(this.input);
            tempInput.insertBefore(this.input);
            this.hiddenInputsDiv = tempInput;
            this.input.attr("name", "_" + this.input.attr("name"));
        }

        const div = $("<div>").attr("class", "card");
        const header = $("<div>").addClass("card-header bg-primary text-white p-2 h5").text(this.title);
        div.append(header);
        const body = $("<div>").addClass("card-body row p-3");
        div.append(body);
        this.unselectedTable = $("<table>").attr("class", this.params.tablesClasses ?? "");
        this.selectedTable = $("<table>").attr("class", this.params.tablesClasses ?? "");
        body.append(
            $("<div>")
                .attr("class", "col-6 px-1")
                .append(
                    $("<div>")
                        .addClass("text-center bg-gray-300 p-1 fw-bolder")
                        .html(this.params.options?.unselectedTableTitle ?? ""),
                )
                .append(this.unselectedTable)
                .append(
                    this.showMoveAllButtons
                        ? this.getActionButton(">>>", "Tout sélectionner", "text-center", async () => {
                              const newSelectedElements = this.unselectedDt
                                  .rows({ search: "applied" })
                                  .data()
                                  .toArray();
                              if (this.params.onChange) {
                                  this.params.onChange(newSelectedElements, []);
                              }
                              this.selectedElements.push(...newSelectedElements);
                              if (this.params.afterChange) {
                                  await this.params.afterChange(
                                      this.getSelectedElements(),
                                      this.getUnselectedElements(),
                                  );
                              }
                              this.drawTables();
                          })
                        : "",
                ),
        );
        body.append(
            $("<div>")
                .attr("class", "col-6 px-1")
                .append(
                    $("<div>")
                        .addClass("text-center bg-gray-300 p-1 fw-bolder")
                        .html(this.params.options?.selectedTableTitle ?? ""),
                )
                .append(this.selectedTable)
                .append(
                    this.showMoveAllButtons
                        ? this.getActionButton("<<<", "Tout supprimer", "text-center", async () => {
                              const searchedElements = this.selectedDt.rows({ search: "applied" }).data().toArray();
                              const toDelete = this.selectedElements.filter((e) => searchedElements.includes(e));
                              if (this.params.onChange) {
                                  this.params.onChange([], toDelete);
                              }
                              this.selectedElements = this.selectedElements.filter(
                                  (e) => !searchedElements.includes(e),
                              );
                              if (this.params.afterChange) {
                                  await this.params.afterChange(
                                      this.getSelectedElements(),
                                      this.getUnselectedElements(),
                                  );
                              }
                              this.drawTables();
                          })
                        : "",
                ),
        );
        div.insertAfter(input);

        // Récupérer les data
        /* if (this.params.data && this.params.data.length > 0) {
            this.elements = this.params.data;
            this.init();
        } else if (this.params.ajax && this.params.ajax?.url) {
            $.ajax({
                url: typeof this.params.ajax?.url === "function" ? this.params.ajax.url() : this.params.ajax.url,
                type: "GET",
                data: this.params.ajax?.data ?? {},
                cache: false,
                dataType: "json",
                headers: {
                    "X-CSRF-Token": getCsrfToken(),
                },
                success: (data) => {
                    this.elements = this.params.ajax?.source ? data[this.params.ajax!.source] : data;
                    this.init();
                },
                error(error) {
                    console.error(error);
                },
            });
        } */
        this.drawTables();
    }

    async reload(_ids: Array<number | string>) {
        if (this.params.data && this.params.data.length > 0) {
            this.elements = this.params.data;
            this.init(_ids);
        } else if (this.params.ajax && this.params.ajax?.url) {
            return $.ajax({
                url: typeof this.params.ajax?.url === "function" ? this.params.ajax.url() : this.params.ajax.url,
                type: "GET",
                data: this.params.ajax?.data ?? {},
                cache: false,
                dataType: "json",
                headers: {
                    "X-CSRF-Token": getCsrfToken(),
                },
                success: (data) => {
                    this.elements = this.params.ajax?.source ? data[this.params.ajax!.source] : data;
                    this.init(_ids);
                },
                error(error) {
                    console.error(error);
                },
            });
        }
    }

    clear() {
        this.unselectedDt.clear();
        this.unselectedDt.draw();
        this.selectedDt.clear();
        this.selectedDt.draw();

        this.input.val("");
    }

    setSelected(ids: (string | number)[]) {
        this._configElements();
        const newSelectedElements: T[] = [];

        ids.forEach((id) => {
            const foundElement = this.elements.find((e) => {
                return this.resolve(e, this.params.fields?.value ?? "value") == id;
            });
            if (foundElement) {
                newSelectedElements.push(foundElement);
            }
        });

        this.selectedElements = newSelectedElements;

        if (this.params.onChange) {
            this.params.onChange(this.getSelectedElements(), this.getUnselectedElements());
        }
        if (this.params.afterChange) {
            this.params.afterChange(this.getSelectedElements(), this.getUnselectedElements());
        }
        this.drawTables();
    }

    _configElements() {
        if (!this.elements) {
            this.elements = [];
        }
        // Configurer les elements
        this.elements.forEach(function (element) {
            if (!element["_dualList" as keyof typeof element]) {
                //@ts-expect-error ça marche comment ?
                element["_dualList" as keyof typeof element] = {};
            }
        });
    }

    private fillOptions() {
        if (this.dataType === "ids") {
            this.input.empty();
            this.elements.forEach((e) => {
                this.input.append(
                    $("<option>")
                        .attr("value", this.resolve(e, this.params.fields?.value ?? "value"))
                        .text(this.resolve(e, this.params.fields?.libelle ?? "libelle")),
                );
            });
        }
    }

    private addClickEvents() {
        this.unselectedTable.on("click", "tr:not(.dtrg-group)", async (e) => {
            const data = this.unselectedDt.row(e.currentTarget).data();
            if (!data) {
                return;
            }
            if (!this.selectedElements.includes(data)) {
                if (this.params.onChange) {
                    this.params.onChange([data], []);
                }
                this.selectedElements.push(data);
                if (this.params.afterChange) {
                    await this.params.afterChange(this.getSelectedElements(), this.getUnselectedElements());
                }
            }
            this.drawTables();
        });

        this.selectedTable.on("click", "tr:not(.dtrg-group)", async (e) => {
            const data = this.selectedDt.row(e.currentTarget).data();
            if (!data) {
                return;
            }
            const selectedElementIndex = this.selectedElements.findIndex((e) => e === data);
            if (this.params.onChange) {
                this.params.onChange([], [this.selectedElements[selectedElementIndex]]);
            }
            this.selectedElements.splice(selectedElementIndex, 1);
            if (this.params.afterChange) {
                await this.params.afterChange(this.getSelectedElements(), this.getUnselectedElements());
            }
            this.drawTables();
        });

        if (this.params.fields?.group) {
            this.unselectedTable.on("click", "tr.dtrg-group", async (e) => {
                const group = $(e.currentTarget).text();
                const newSelectedElements = this.elements.filter(
                    (e) => (this.resolve(e, this.params.fields?.group ?? "group") ?? "No group") === group,
                );
                if (this.params.onChange) {
                    this.params.onChange(newSelectedElements, []);
                }
                this.selectedElements.push(...newSelectedElements);
                if (this.params.afterChange) {
                    await this.params.afterChange(this.getSelectedElements(), this.getUnselectedElements());
                }
                this.drawTables();
            });

            this.selectedTable.on("click", "tr.dtrg-group", async (e) => {
                const group = $(e.currentTarget).text();
                const newUnselectedElements = this.selectedElements.filter(
                    (e) => (this.resolve(e, this.params.fields?.group ?? "group") ?? "No group") === group,
                );
                if (this.params.onChange) {
                    this.params.onChange([], newUnselectedElements);
                }
                this.selectedElements = this.selectedElements.filter(
                    (e) => (this.resolve(e, this.params.fields?.group ?? "group") ?? "No group") !== group,
                );
                if (this.params.afterChange) {
                    await this.params.afterChange(this.getSelectedElements(), this.getUnselectedElements());
                }
                this.drawTables();
            });
        }
    }

    init(_ids: Array<number | string>) {
        this._configElements();

        this.fillOptions();

        this.drawTables();

        // Suppression class indésirable rajouté par DataTable
        this.unselectedTable.removeClass("no-footer");
        this.selectedTable.removeClass("no-footer");

        // Ajout propriété css custom
        this.unselectedTable.css("box-sizing", "border-box");
        this.selectedTable.css("box-sizing", "border-box");

        this.addClickEvents();

        this.setSelected(_ids);
    }

    initDataTable(table: JQuery<HTMLElement>, data: T[], search: string): Api<T> {
        const opts: Config = {
            ...this.params.dataTableOptions,
            ordering: !this.keepOrder,
            data: data,
            dom: this.params.dataTableOptions?.dom ?? "fti",
            paging: this.params.dataTableOptions?.paging ?? false,
            destroy: true,
            language: {
                ...language,
                search: "",
                searchPlaceholder: "Rechercher",
            },
            search: { search: search },
            columns: [
                {
                    data: null,
                    orderable: !this.keepOrder,
                    render: (data) => {
                        if (this.params.cellRender != null) {
                            return this.params.cellRender(data);
                        } else {
                            return this.resolve(data, this.params.fields?.libelle ?? "libelle") ?? "-?-";
                        }
                    },
                },
            ],
            initComplete: () => {
                $("div.dt-search").addClass("py-1");
                $("div.dt-search input").addClass("w-100 ms-0");
            },
        };

        if (this.params.fields?.group) {
            opts.rowGroup = {
                dataSrc: this.params.fields?.group,
            };
            opts.columns?.unshift({
                data: null,
                render: (data) => {
                    return this.resolve(data, this.params.fields?.group ?? "group") ?? "No group";
                },
                visible: false,
            });
        }
        return table.DataTable(opts);
    }

    getUnselectedElements() {
        const res = (this.elements ?? []).filter((e) => {
            return !(this.selectedElements ?? []).includes(e);
        });
        return res;
    }

    getSelectedElements() {
        return this.selectedElements;
    }

    drawTables() {
        this.unselectedDt = this.initDataTable(
            this.unselectedTable,
            this.getUnselectedElements(),
            this.unselectedTableSearch,
        );
        if (!this.unselectedTable.attr("data-dual-list-events")) {
            this.unselectedDt.on("search.dt", () => {
                this.unselectedTableSearch = this.unselectedDt.search().toString();
            });
            this.unselectedTable.attr("data-dual-list-events", "registered");
        }
        this.selectedDt = this.initDataTable(this.selectedTable, this.selectedElements, this.selectedTableSearch);
        if (!this.selectedTable.attr("data-dual-list-events")) {
            this.selectedDt.on("search.dt", () => {
                this.selectedTableSearch = this.selectedDt.search().toString();
            });

            // if (this.keepOrder) {
            //     this.selectedDt.on('row-reorder', function (e, diff, edit) {
            //         console.log(e, diff, edit);
            //         console.log(diff);

            //         diff.forEach(e => {
            //             let data = c.selectedDt.row(e.node).data();
            //             let newPosition = e.newPosition;
            //             let oldPosition = e.oldPosition;

            //             let foundSelected = c.selectedElements.find(function (e) {
            //                 return c.resolve(e, c.params.fields?.value ?? "value") == id;
            //             });

            //             console.log(foundSelected);

            //         });
            //     });
            // }

            this.selectedTable.attr("data-dual-list-events", "registered");
        }

        if (this.dataType === "ids") {
            this.input.val(this.selectedElements.map((e) => this.resolve(e, this.params.fields?.value ?? "value")));
        } else if (this.dataType === "object") {
            this.hiddenInputsDiv?.empty();
            const datas = this._buildSelectedInputs();
            datas.forEach((data) => {
                //@ts-expect-error comment ça marche ?
                this.hiddenInputsDiv?.append($("<div>").attr("class", "input-group").append(data["built_inputs"]));
            });
            // this.input.outerHTML = $("<div>").
            // this.input.val(this.selectedElements.map((e) => this.resolve(e, this.params.fields?.value ?? "value")));
        }
    }

    private resolve(obj: T, path: string, separator = ".") {
        const properties = Array.isArray(path) ? path : path.split(separator);
        return properties.reduce((prev, curr) => prev?.[curr], obj);
    }

    private getActionButton(label: string, title: string, divClass: string, onClick: (e: Event) => void) {
        return $("<div>")
            .attr("class", `pt-1 ${divClass}`)
            .append(
                $("<button>").attr("title", title).attr("type", "button").attr("class", "btn btn-primary").text(label),
            )
            .on("click", onClick);
    }

    /**
     * Retourne le set d'inputs pour l'objet construit a partir de DualList.object
     */
    private _buildSingleInputData(element: T, index: number) {
        const array: InputDataProperties[] = [];

        for (let lineIndex = 0; lineIndex < (this.object ?? [])?.length; lineIndex++) {
            const objFormat = this.object![lineIndex];

            let transformedValue: string | null = null;
            if (objFormat.value) {
                if (typeof objFormat.value == "string") {
                    if (objFormat.value.startsWith("_") && objFormat.value.endsWith("_")) {
                        if (objFormat.value == "_index_") {
                            transformedValue = index.toString();
                        }
                    } else {
                        transformedValue = this.resolve(element, objFormat.value) ?? objFormat.value;
                    }
                } else if (typeof objFormat.value === "function") {
                    transformedValue = objFormat.value(element, index);
                }
            }

            array.push({
                name: objFormat.name.replace("_index_", index.toString()),
                value: transformedValue,
            });
        }

        return array;
    }

    /**
     * Construit l'input de l'element en se basant sur element.input_datas
     */
    private _buildSingleInput(input_data: InputDataProperties): JQuery<HTMLElement> {
        return $("<input>").attr("name", input_data.name).attr("value", input_data.value);
    }

    private _buildInputs(input_datas: InputDataProperties[]) {
        // const array: JQuery<HTMLElement>[] = [];
        // input_datas.forEach((input_data) => {
        //     array.push(this._buildSingleInput(input_data));
        // });
        return input_datas.map((input_data) => this._buildSingleInput(input_data));
    }

    /**
     * Construit l'input des objets sélectionnés si nécessaire.
     * Attribue selectedElement.input_datas & selectedElement.input
     * Retourne la liste des dualListData
     */
    private _buildSelectedInputs() {
        const res: InputDataProperties[] = [];

        for (let index = 0; index < this.selectedElements.length; index++) {
            const selectedElement: T = this.selectedElements[index];
            const dualListData = selectedElement["_dualList" as keyof typeof selectedElement];

            // if (!dualListData.is_built) {
            const input_datas = this._buildSingleInputData(selectedElement, index);
            //@ts-expect-error comment ça marche ?
            dualListData.input_datas = input_datas;
            //@ts-expect-error comment ça marche ?
            dualListData.built_inputs = this._buildInputs(input_datas);
            // dualListData.index = index;
            //     dualListData.is_built = true;
            // }

            //@ts-expect-error comment ça marche ?
            res.push(dualListData);
        }

        return res;
    }
}

type InputDataProperties = {
    name: string;
    value: string | null;
};
