import { Notyf } from "notyf";
import "notyf/notyf.min.css";

export const pause = (ms: number) => new Promise((res) => setTimeout(res, ms));

let timer: number | undefined;
export function delay(ms: number) {
    return function (callback: () => void) {
        clearTimeout(timer);
        timer = setTimeout(callback, ms);
    };
}

function createSpinner(parentSelector: string): JQuery<HTMLElement> {
    const res = $("<div>").addClass("spinner");

    if (parentSelector === "body") {
        res.css("z-index", 9999);
    } else {
        const zIndex = getStyle(parentSelector, "z-index");
        if (zIndex) {
            const newZIndex = (!isNaN(Number(zIndex)) ? Number(zIndex) : 0) + 1;
            res.css("z-index", newZIndex);
        }
    }

    return res;
}

function getStyle(selector: string, styleProp: string): string | null {
    const element = document.querySelector(selector);

    if (element) {
        return document.defaultView?.getComputedStyle(element, null).getPropertyValue(styleProp) ?? null;
    }

    return null;
}

const spinnerMap = new Map<string, JQuery<HTMLElement>>();

export function sysopStartLoader(target: string = "body") {
    if (spinnerMap.has(target)) {
        console.warn("already loading on", target);
        return;
    }
    spinnerMap.set(target, createSpinner(target));
    $(target).css("position", "relative");
    $(target).append(spinnerMap.get(target)!);
}

export function sysopEndLoader(target: string = "body") {
    if (!spinnerMap.has(target)) {
        console.warn("no spinner on", target);
        return;
    }
    const spinner = spinnerMap.get(target);
    spinner?.remove();
    spinnerMap.delete(target);
}

export const baseUrl = window["base_url" as keyof Window];

export const toaster = new Notyf({
    duration: 5000,
    dismissible: true,
    position: {
        x: "right",
        y: "top",
    },
});

export const defautNotAllowedMessage = "Erreur : Vous n'êtes pas autorisé a effectuer cette action";

export function showNotAllowedError() {
    showError(defautNotAllowedMessage);
}

export function showError(message: string) {
    toaster.error(message);
}

export function showSuccess(message: string) {
    toaster.success(message);
}
