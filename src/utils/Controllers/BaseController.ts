import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import "jquery-validation";
import Swal from "sweetalert2";
import { getAuthenticatedUser } from "../AuthUtils.js";
import { ConfirmProps } from "../swalUtils.js";

dayjs.extend(utc);

/**
 * Propriétés pour la boîte de dialogue de confirmation de suppression.
 * @template T - Type de l'élément à supprimer (par défaut: unknown).
 */
export type DeleteConfirmProps<T = unknown> = {
    /** Titre de la boîte de dialogue */
    title: string;
    /** Contenu/message de la boîte de dialogue */
    content: string;
    /** Fonction à exécuter lors de la confirmation */
    onConfirm: (item: T) => unknown;
};

export type BaseControllerProps = {
    formId: string;
};

export abstract class BaseController<T> {
    form: JQuery<HTMLFormElement>;
    formId: string;

    private static readonly _USER = getAuthenticatedUser();

    constructor({ formId }: BaseControllerProps) {
        this.formId = formId;
        this.form = $(formId);
    }

    public get authenticatedUser() {
        return BaseController._USER;
    }

    /**
     * Affiche une boîte de dialogue de confirmation pour les opérations de suppression en utilisant SweetAlert2.
     *
     * @returns Une promesse qui se résout avec le résultat de la boîte de dialogue SweetAlert2.
     */
    protected showDeleteConfirm<T = unknown>(props: DeleteConfirmProps<T>) {
        return this.showConfirm({
            title: props.title,
            content: props.content,
            icon: "warning",
            cancelButtonText: "Annuler",
            confirmButtonText: "Supprimer",
            confirmButtonColor: "var(--bs-danger)",
            onConfirm: props.onConfirm,
        });
    }

    protected showConfirm<T = unknown>(props: ConfirmProps<T>) {
        return Swal.fire({
            title: props.title,
            text: props.content,
            icon: props.icon,
            showCancelButton: true,
            cancelButtonText: props.cancelButtonText ?? "Annuler",
            confirmButtonText: props.confirmButtonText,
            confirmButtonColor: props.confirmButtonColor,
            showLoaderOnConfirm: true,
            preConfirm: props.onConfirm,
        });
    }

    public resetFormValidity(form: JQuery<HTMLFormElement> = this.form) {
        form?.removeClass("was-validated");
        $(".is-valid").removeClass("is-valid");
        $(".is-invalid:not(span)").removeClass("is-invalid");
        form?.find("input,select").removeClass("error");
        form?.validate().resetForm();
    }

    protected resetFieldValidity(field: JQuery<HTMLElement>) {
        field.removeClass("error");
        field.siblings("label.error").remove();
    }

    public resetForm(form: JQuery<HTMLFormElement> | undefined = this.form): void | Promise<void> {
        form?.[0].reset();
        this.resetFormValidity();
        form.find("input[type=hidden]").each((_, input) => {
            const $input = $(input);
            if ($input.attr("name") === "_csrfToken") {
                return;
            }

            if ($input.attr("type") === "hidden") {
                $input.val("");
            }
        });
        form.find("select").each((_, select) => {
            const $select = $(select);
            if ($select.attr("multiple")) {
                $select.val([]).trigger("change");
            } else {
                $select.val("").trigger("change");
            }
        });
    }

    protected async resetView() {}

    protected async fillFormWith(item: T) {
        for (const field in item) {
            if (Object.prototype.hasOwnProperty.call(item, field)) {
                let value = item[field];

                // Si la valeur est un objet, on essaie de récupérer le path ou le nom
                if (typeof value === "object" && value !== null) {
                    type KeyOfValue = keyof typeof value;

                    //@ts-expect-error Va falloir corriger, mais pas le temps là tout de suite
                    value =
                        value["path" as KeyOfValue] ??
                        value["long_name" as KeyOfValue] ??
                        value["name" as KeyOfValue] ??
                        value["num" as KeyOfValue] ??
                        "-";
                }

                const fieldElements = this.form.find(`[name="${field}"]`);
                fieldElements.each((_, element) => {
                    const fieldElement = $(element);
                    const type = fieldElement.attr("type");

                    switch (type) {
                        case "checkbox":
                            fieldElement.prop("checked", Boolean(value));
                            break;
                        case "radio":
                            fieldElement.filter(`[value="${value}"]`).prop("checked", true);
                            break;
                        case "select-one":
                        case "select-multiple":
                            fieldElement.val(value as string[]).trigger("change");
                            break;
                        case "date":
                            fieldElement.val(dayjs.utc(value as string).format("YYYY-MM-DD"));
                            break;
                        case "time":
                            fieldElement.val(dayjs.utc(value as string).format("HH:mm"));
                            break;
                        case "datetime-local":
                            fieldElement.val(dayjs.utc(value as string).format("YYYY-MM-DD HH:mm"));
                            break;
                        case "hidden":
                            if (this.form.find(`[name="${field}"][type="checkbox"]`).length > 0) {
                                fieldElement.val("0");
                            } else {
                                fieldElement.val(value as string);
                            }
                            break;
                        default:
                            fieldElement.val(value as string);
                    }
                });
            }
        }
    }

    /**
     * Formate la valeur donnée en fonction du path qu'on lui donne.
     * @param rawValue La value brute à formatter en fonction de son type
     * @param field Le nom du champ. Important pour récupérer les valeurs en cascade ou pour formatter les dates.
     * @param deepSearch Permet de savoir si on doit rechercher le champ par rapport à n path complexe ou pas
     * @returns La valeur formatée en `string`
     */
    protected formatFieldValue(
        rawValue: T | T[Extract<keyof T, string>],
        field: string,
        action: "view" | "edit",
        fallback: string = "",
    ) {
        const value = action === "view" ? this.getDeepValue(rawValue, field) : rawValue;
        return this.isDate(value)
            ? this.formatDateField(value as string, field, action === "edit" ? "YYYY-MM-DD HH:mm" : "DD/MM/YYYY HH:mm")
            : (value?.toString() ?? fallback);
    }

    /**
     * Récupère la valeur directement s'il ne s'agit pas d'un objet.
     * Dans le cas où passe à cette fonction un objet, le path permet de récupérer en cascade le champ demandé.
     *
     * @param value La valeur à partir de laquelle on veut extraire une sous-donnée
     * @param path Le path pour accéder à la donnée. Exemple:
     *
     * `getDeepValue({agent:{name:"John Doe"}}, "agent.name")` retourne "John Doe".
     *
     * `getDeepValue({user:{agent:{name:"John Doe"}}}, "user.agent.name")` retourne "John Doe".
     *
     * `getDeepValue("coucou", "user.agent.name")` retourne "coucou".
     *
     * @returns La valeur directe ou extraite
     */
    private getDeepValue(value: unknown, path: string) {
        const subFields = path.split(".");
        for (let i = 0, n = subFields.length; i < n; ++i) {
            if (["string", "number", "bigint", "boolean", "undefined"].includes(typeof value)) {
                return value;
            }
            const key = subFields[i];
            if (typeof value === "object" && value !== null && key in value) {
                value = value[key as keyof typeof value];
            } else {
                return "-";
            }
        }
        return value;
    }

    /**
     * Indique si oui ou non la valeur d'entrée ressemble à une date.
     *
     * **Info importante: le séparateur est `-`.**
     * @param value La valeur à tester
     * @returns `true` si la valeur ressemble à une date et `false` sinon
     */
    private isDate(value?: unknown) {
        const dateRegexp = /(\d{4})-(\d{2})-(\d{2})/;
        return dateRegexp.test(value?.toString() ?? "");
    }

    /**
     * Permet de formatter une date en fonction du path donné. Par exemple:
     *
     * `formatDateField("2025-07-08T11:15:30", "date")` va retourner "08/07/2025 11:15"
     *
     * `formatDateField("2025-07-08T11:15:30", "date.date")` va retourner "08/07/2025"
     *
     * `formatDateField("2025-07-08T11:15:30", "date.heure")` va retourner "11:15"
     *
     * @param value La date à formatter
     * @param field Le nom du champ. Il permet d'afficher la date et/ou l'heure.
     * @param format Le format à utiliser
     * @returns La date formatée
     */
    private formatDateField(value: string, field: string, format: string = "YYYY-MM-DD HH:mm") {
        if (field.includes(".date")) {
            format = "DD/MM/YYYY";
        } else if (field.includes(".heure")) {
            format = "HH:mm";
        }
        return dayjs.utc(value?.toString()).format(format);
    }

    protected async fillViewWith(item: T) {
        console.log("fill view with", item);
    }

    protected abstract baseAttachEvents(): void | Promise<void>;
    protected abstract baseDetachEvents(): void | Promise<void>;
}
