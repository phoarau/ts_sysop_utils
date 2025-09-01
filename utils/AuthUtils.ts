import Swal from "sweetalert2";
import { baseUrl } from "./commonUtils";
import { httpClient } from "./httpClient";

export async function getAuthenticatedUser<User>() {
    const user = await $.getJSON(`${baseUrl}users/me.json`);
    return user as User;
}
/**
 * Déclaré dans le layout/default.php
 */
// declare const csrfToken: string;

export function getCsrfToken() {
    return window["csrfToken"];
}

export async function userIsAllowedTo(
    codeAction: string,
    module: string,
    options?: { showAlert?: boolean },
): Promise<boolean> {
    const res = await httpClient.get<boolean>(`${baseUrl}users/isAllowed/${module}/${codeAction}.json`);

    if (!res && options?.showAlert) {
        Swal.fire({
            icon: "error",
            title: "Accès refusé",
            text: genericNotAllowedMessage,
        });
    }

    return res;
}

// export function PreferenceRestricted(options: { module: string; action: string; showAlertWhenNotAllowed?: boolean }) {
//     return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) {
//         const originalMethod = descriptor.value;
//         descriptor.value = async function (...args: unknown[]) {
//             const isAllowed = await userIsAllowedTo(
//                 options.action,
//                 options.module,
//                 options.showAlertWhenNotAllowed ?? true,
//             );
//             if (isAllowed) {
//                 return originalMethod.apply(this, args);
//             }
//             return null;
//         };
//         return descriptor;
//     };
// }

export const genericNotAllowedMessage = "Vous n'êtes pas autorisé à effectuer cette action";
