import Swal from "sweetalert2";
import * as filepond from "filepond";
import "filepond/dist/filepond.min.css";
import { getCsrfToken } from "../../utils/AuthUtils";
import { sysopEndLoader, sysopStartLoader, toaster } from "../../utils/commonUtils";
import { TableAjaxController, TableAjaxProps } from "./TableAjaxController";
import { AjaxControllerProps } from "./AjaxController";

type Props<T> = TableAjaxProps<T> &
    AjaxControllerProps & {
        readonly fileInputId: string;
        readonly importFormId: string;
        readonly selectElements: JQuery<HTMLSelectElement>;
        readonly localStoragePrefix: string;
        readonly requiredFields: string[];
        readonly onSuccess: () => void | Promise<void>;
    };

export abstract class CsvImportController<
    T extends { id: number | string; status?: string },
> extends TableAjaxController<T> {
    public imported_datas: {
        headers: Record<string, string>;
        datas: Record<string, string>[];
    } = { headers: {}, datas: [] };
    public imported_analyse: Record<string, boolean>[] = [];
    public computed_datas: Record<string, unknown>[] = [];

    public uploader: filepond.FilePond | null;

    private importFormId: string;
    protected selectElements: JQuery<HTMLSelectElement>;
    private localStoragePrefix: string;
    private requiredFields: string[];
    private onSuccess: () => void | Promise<void>;

    constructor(props: Props<T>) {
        super(props);
        this.selectElements = props.selectElements;
        this.localStoragePrefix = props.localStoragePrefix;
        this.requiredFields = props.requiredFields;
        this.importFormId = props.importFormId;
        this.onSuccess = props.onSuccess;

        const fileInputElement = document.querySelector(props.fileInputId);
        this.uploader = fileInputElement
            ? filepond.create(fileInputElement, {
                  credits: false,
                  name: "import",
                  storeAsFile: true,
                  required: true,
                  onaddfile: async (error, file) => {
                      $(props.fileInputId).val(file.filenameWithoutExtension).trigger("keyup");
                      sysopStartLoader();
                      await this.import(file);
                      sysopEndLoader();
                  },
              })
            : null;

        this.initEvents();
    }

    async import(file: filepond.FilePondFile) {
        const form = $(this.importFormId) as JQuery<HTMLFormElement>;
        const formData = new FormData(form[0]);
        const validator = form.validate({});
        if (!validator.form()) {
            console.warn("Formulaire invalide");

            return;
        }

        const json = await $.ajax({
            url: `${this.url}/import.json`,
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            dataType: "json",
            error(error) {
                console.error(error);
                Swal.fire("Erreur lors de l'import", "Problème lors de l'import", "error");
            },
        });

        if (json.status === 0) {
            this.uploader?.removeFile(file);
            this.imported_datas = json.datas;
            await this.treatImportedData();
        } else {
            Swal.fire("Erreur lors de l'import", json.message, "error");
        }
    }

    async treatImportedData() {
        const selects = this.selectElements;
        selects.empty();
        selects.append($("<option>").val("").text("** Choisir  **"));

        // Ordonne les valeurs par ordre alphabetique
        const sortedHeaders = Object.entries(this.imported_datas.headers);
        sortedHeaders.sort((a, b) => {
            const aValue = (a[1] ?? "").toString();
            const bValue = (b[1] ?? "").toString();
            if (aValue < bValue) {
                return -1;
            }
            if (aValue > bValue) {
                return 1;
            }
            return 0;
        });

        // Remplit les select
        $.each(sortedHeaders, (index, entry) => {
            const option = $("<option>")
                .val(entry[0].toString())
                .text((entry[1] ?? "")?.toString());
            selects.append(option);
        });

        selects.each((i, e) => {
            const elementId = $(e).attr("id");
            const storedValue = localStorage.getItem(`${this.localStoragePrefix}.${elementId}`);
            $(e).val(storedValue ?? "");
        });
        await this.loadTable();
    }

    async loadTable() {
        const rows: Record<string, unknown>[] = [];

        $.each(this.imported_datas.datas, (n, data) => {
            const row: Record<string, unknown> = {};
            $.each(this.selectElements, (k, v) => {
                row[$(v).data("field")] = data[$(v).val()?.toString() ?? ""] ?? "";
            });

            rows.push(row);
        });

        this.computed_datas = rows;

        await this.checkImport();
    }

    async checkImport() {
        const d = await $.ajax({
            url: `${this.url}/checkImport.json`,
            data: {
                data: JSON.stringify(this.computed_datas),
            },
            type: "POST",
            cache: false,
            headers: {
                "X-CSRF-Token": getCsrfToken(),
            },
            dataType: "json",
            error(error) {
                console.error(error);
                Swal.fire("Erreur", "Impossible de vérifier les données", "error");
            },
        });
        this.imported_analyse = d.analyse;
        this.table!.clear();
        this.table!.rows.add(this.computed_datas as T[]);
        this.table!.draw();
    }

    protected createdCell(td: Node, row: number, col: string) {
        if (this.imported_analyse && !this.imported_analyse?.[row]?.[col]) {
            $(td).addClass("bg-danger text-white");
        }
    }

    saveImport() {
        const validator = this.form!.validate();

        if (!validator.form()) {
            console.warn("Formulaire invalide");
            return;
        }

        const isAllRequiredDataMapped = this.requiredFields.every(
            (field) => this.selectElements.find(`[data-field="${field}"]`).val() !== "",
        );

        if (!isAllRequiredDataMapped) {
            toaster.error({
                message:
                    "Certaines colonnes obligatoires (annotés avec *) n'ont pas été renseignées, veuillez terminer leur saisie avant d'importer les données",
            });
            return;
        }

        Swal.fire({
            title: "Êtes-vous sûr(e)?",
            text: "Vérifiez bien les lignes à importer. Les données surlignées en rouge ne seront pas importées.",
            icon: "warning",
            showCancelButton: true,
            cancelButtonText: "Annuler",
            confirmButtonText: "Importer",
            confirmButtonColor: "var(--bs-warning)",
            showLoaderOnConfirm: true,
            preConfirm: () => {
                return $.ajax({
                    url: `${this.url}/saveImport.json`,
                    data: {
                        data: JSON.stringify(this.computed_datas),
                    },
                    type: "POST",
                    cache: false,
                    headers: {
                        "X-CSRF-Token": getCsrfToken(),
                    },
                    dataType: "json",
                    success: (d) => {
                        if (d.status === 0) {
                            Swal.fire("Succès", d.message, "success");
                            this.modal?.hide();
                            this.onSuccess();
                        } else {
                            Swal.fire("Erreur", "Impossible d'importer les données", "error");
                        }
                    },
                    error(error) {
                        console.error(error);
                        Swal.fire("Erreur", "Impossible d'importer les données", "error");
                    },
                });
            },
        });
    }

    /**
     * Enregistre sur la machine les choix des selects fait pour pouvoir les re selectionner automatiquement plus tard
     */
    saveSelectValue(jqHtmlEl: JQuery<HTMLElement>): void {
        localStorage.setItem(`${this.localStoragePrefix}.${jqHtmlEl.attr("id")}`, jqHtmlEl.val()?.toString() ?? "");
    }

    protected initEvents() {
        $(this.modalId!)
            .find(".btn-import")
            .on("click", () => {
                this.saveImport();
            });
    }
}
