import dayjs from "dayjs";

export function formatTimestampToHHMMSS(timestamp: number) {
    const sec_num = timestamp; // don't forget the second param
    const hours = Math.floor(sec_num / 3600);
    const minutes = Math.floor((sec_num - hours * 3600) / 60);
    const seconds = sec_num - hours * 3600 - minutes * 60;

    const h_str = hours ? `${hours} h ` : "";
    const minutes_suffix = minutes > 1 ? "s" : "";
    const m_str = minutes ? `${minutes} min${minutes_suffix} ` : "";
    const s_str = seconds ? `${seconds} s` : "";
    //if (hours   < 10) {hours   = "0"+hours;}
    //if (minutes < 10) {minutes = "0"+minutes;}
    //if (seconds < 10) {seconds = "0"+seconds;}
    return h_str + m_str + s_str;
}

type NumberFormatOptions = {
    nbFractionDigits?: number;
    type?: "decimal" | "percent";
};

export function formatNumber(num: number, options?: NumberFormatOptions) {
    return new Intl.NumberFormat("fr-FR", {
        minimumFractionDigits: options?.nbFractionDigits ?? 2,
        maximumFractionDigits: options?.nbFractionDigits ?? 2,
        style: options?.type === "percent" ? "percent" : "decimal",
    }).format(num);
}

export function nl2br(str: string, is_xhtml?: boolean) {
    if (!str) return "";
    const breakTag = is_xhtml || typeof is_xhtml === "undefined" ? "<br " + "/>" : "<br>";
    return (str + "").replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, "$1" + breakTag + "$2");
}

export function formatDateTime(value: dayjs.ConfigType, format: string, defaultContent: string = "-") {
    return value && dayjs(value).format(format) !== "Invalid Date" ? dayjs(value).format(format) : defaultContent;
}

export function formatDuration(time: number) {
    let displayedTime = `${time ?? 0} mins`;

    if (time > 60) {
        const hours = Math.ceil(time / 60);
        displayedTime = `${hours} H`;
        const minutes = time % 60;
        if (minutes > 0) {
            displayedTime += ` ${minutes} mins`;
        }
    }

    if (time < 0) {
        displayedTime = "-";
    }

    return displayedTime;
}

type MoneyFormatOptions = {
    nbFractionDigits?: number;
};

export function formatMoney(value: number, options?: MoneyFormatOptions) {
    return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: options?.nbFractionDigits ?? 2,
        maximumFractionDigits: options?.nbFractionDigits ?? 2,
    }).format(value);
}

export function hexToRgbA(hex: string, opacity: string | number) {
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let c: any = hex.substring(1).split("");
        if (c.length == 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = `0x${c.join("")}`;
        return `rgba(${[(c >> 16) & 255, (c >> 8) & 255, c & 255].join(",")},${opacity})`;
    }
    throw new Error("Bad Hex");
}
