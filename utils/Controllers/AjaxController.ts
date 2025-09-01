import Swal from "sweetalert2";
import { getCsrfToken } from "../AuthUtils";
import { CakeError, CustomCakeResponse } from "../Types";
import { BaseController, BaseControllerProps } from "./BaseController";
import $ from "jquery";

export type AjaxControllerProps = { url: string } & BaseControllerProps;

/**
 * TODO: Réfléchir au moyen de ne pas avoir la fonction delete pour certains controllers
 */
export abstract class AjaxController<
    T extends { id: E },
    E = number | string | null | undefined
> extends BaseController<T> {
    url: string;
    item: T | null;
    onSaved?: <T>(item: T | null | undefined) => Promise<void> | void;
    onDeleted?: (item: T | null | undefined) => Promise<void> | void;

    constructor({ formId, url }: AjaxControllerProps) {
        super({
            formId,
        });
        this.url = url;
        this.item = null;
    }

    /**
     * Génère l'URL pour afficher les détails d'un élément spécifique.
     *
     * @param id - L'identifiant unique de l'élément à afficher.
     * @param options - Un objet contenant des paramètres optionnels.
     * @param options.action - L'action à effectuer, par défaut "view".
     * @param options.extension - L'extension de fichier pour la requête, par défaut "json".
     * @returns L'URL générée pour l'affichage de l'élément.
     */
    protected getViewUrl<E>(id: E, { action = "view", extension = "json" }: { action?: string; extension?: string }) {
        return `${this.url}/${action}/${id}.${extension}`;
    }

    protected getDeleteUrl<E>(
        id: E,
        { action = "delete", extension = "json" }: { action?: string; extension?: string }
    ) {
        return `${this.url}/${action}/${id}.${extension}`;
    }

    /**
     * Récupère l'élément dont l'`id` est celui passé en paramètre.
     *
     * @param id - L'identifiant unique de l'élément à afficher.
     * @param options - Un objet contenant des paramètres optionnels.
     * @param options.action - L'action à effectuer, par défaut "view".
     * @param options.extension - L'extension de fichier pour la requête, par défaut "json".
     * @returns L'item récupéré
     */
    async fetchItem(id: E, options?: { action?: string; extension?: string }) {
        const item = await $.ajax({
            url: this.getViewUrl(id, {
                action: options?.action ?? "view",
                extension: options?.extension ?? "json",
            }),
            dataType: "json",
            error(error) {
                console.error(error);
            },
        });
        return item as T;
    }

    protected async post<Result = CustomCakeResponse<never>>(url: string, data: object) {
        const res = (await $.ajax({
            url,
            data,
            type: "POST",
            cache: false,
            headers: {
                "X-CSRF-Token": getCsrfToken(),
            },
            dataType: "json",
        })) as Result;
        return res;
    }

    /**
     * Récupère et affiche les détails d'un élément spécifique.
     *
     * @param id - L'identifiant unique de l'élément à afficher.
     * @param options - Un objet contenant des paramètres optionnels.
     * @param options.action - L'action à effectuer, par défaut "view".
     * @param options.extension - L'extension de fichier pour la requête, par défaut "json".
     * @returns L'item récupéré
     */
    async baseView(id: E, options?: { action?: string; extension?: string }) {
        // On détache les événements avant de les attacher au cas où on fait 2 view sans fermer la modale entre
        await this.baseDetachEvents();
        await this.baseAttachEvents();
        this.item = await this.fetchItem(id, options);
        await this.resetView();
        await this.fillViewWith(this.item);

        return this.item;
    }

    async baseNew() {
        await this.baseAttachEvents();
        await this.resetForm();
    }

    async baseEdit(id: E, options: { action?: string; extension?: string }) {
        // On détache les événements avant de les attacher au cas où on fait 2 edit sans fermer la modale entre
        await this.baseDetachEvents();
        await this.baseAttachEvents();
        await this.resetForm();
        this.item = await this.fetchItem(id, options);
        await this.fillFormWith(this.item);

        return this.item;
    }

    async baseSave<Res = T>(
        data: object,
        options: { action?: string; extension?: string }
    ): Promise<CustomCakeResponse<Res>> {
        const response: CustomCakeResponse<Res> = await $.ajax({
            url: `${this.url}/${options?.action ?? "save"}.${options?.extension ?? "json"}`,
            type: "POST",
            data,
            processData: false,
            contentType: false,
            dataType: "json",
            error(error) {
                console.error(error);
                Swal.fire("Erreur!", "Impossible d'enregistrer", "error");
            },
        });

        if (response.status === 0) {
            if (this.onSaved) {
                await this.onSaved(response.item as Res);
            }
            Swal.fire("Succès", "L'enregistrement a bien été réalisé !", "success");
        } else {
            Swal.fire("Erreur lors de l'enregistrement", response.message, "error");
        }

        return response;
    }

    async baseDelete<E = number | string | null | undefined>(
        id: E,
        {
            title = "Êtes-vous sûr ?",
            content = "La donnée sélectionnée va être supprimée définitivement",
            onConfirm,
            action = "delete",
            extension = "json",
        }: {
            title?: string;
            content?: string;
            onConfirm: (item: T | null | undefined) => unknown;
            action?: string;
            extension?: string;
        }
    ): Promise<boolean> {
        if (!id) {
            console.error(`L'ID ${id?.toString()} est invalide`);
            return false;
        }

        const swalRes = await this.showDeleteConfirm({
            title,
            content,
            onConfirm: async () => {
                try {
                    const { status, message, item }: CustomCakeResponse<T> = await $.ajax({
                        url: `${this.url}/${action}/${id}.${extension}`,
                        type: "POST",
                        cache: false,
                        headers: {
                            "X-CSRF-Token": getCsrfToken(),
                        },
                        dataType: "json",
                    });

                    if (status === 0) {
                        Swal.fire("Succès!", "Suppression réussie", "success");
                        if (this.onDeleted) {
                            await this.onDeleted(item);
                        }
                        onConfirm(item);
                    } else {
                        Swal.fire("Erreur!", message, "error");
                    }
                } catch (error) {
                    const response = error.responseJSON as CakeError;
                    if (response?.message) {
                        Swal.fire("Impossible de supprimer", response.message, "error");
                    } else {
                        Swal.fire("Erreur!", "Impossible de supprimer", "error");
                    }
                }
            },
        });

        return swalRes.isConfirmed;
    }

    public async resetForm(form: JQuery<HTMLFormElement> | undefined = this.form) {
        await super.resetForm(form);
        this.item = null;
    }
}
