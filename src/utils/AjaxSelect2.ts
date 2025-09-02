import { DataFormat, GroupedDataFormat } from "select2";
import "select2";

/* Utilitaire pour charger une liste Select2 par ajax
 *
 * Permet de charger la liste une fois et de la rechargé a la demande
 */
export class AjaxSelect2 {
    onChange(callback: () => void) {
        throw new Error("Method not implemented.");
        callback();
    }
    inputId: string;
    input: JQuery<HTMLElement>;
    url: string | (() => string);
    select2Options?: Select2.Options;

    constructor({ inputId, url, select2Options }: AjaxSelect2Params) {
        this.inputId = inputId;
        this.input = $(inputId);
        this.url = url;
        this.select2Options = select2Options;
    }

    /**
     * Renvoie la liste des options depuis le serveur
     */
    async #fetchList(
        data?: JQuery.PlainObject | string,
        success?: JQuery.jqXHR.DoneCallback,
    ): Promise<DataFormat[] | GroupedDataFormat[]> {
        let url = "";

        switch (typeof this.url) {
            case "string":
                url = this.url;
                break;

            case "function":
                url = this.url();
                break;
        }

        return $.getJSON(url, data ?? "", success ?? (() => {}));
    }

    #buildSelect(data: DataFormat[] | GroupedDataFormat[]): void {
        if (this.input.data("select2")) {
            this.input.select2("destroy");
            this.input.find('option:not([value=""])').remove();
        }

        $(this.inputId).select2({ data: data, ...this.select2Options });
    }

    async reload(data?: JQuery.PlainObject | string, success?: JQuery.jqXHR.DoneCallback): Promise<void> {
        const list = await this.#fetchList(data, success);
        this.#buildSelect(list);
        if (!data) {
            this.input.val("").trigger("change");
        }
    }

    on(evt: string, callback: () => void | Promise<void>) {
        $(this.inputId).on(evt, callback);
    }
}

type AjaxSelect2Params = { inputId: string; url: string | (() => string); select2Options?: Select2.Options };
