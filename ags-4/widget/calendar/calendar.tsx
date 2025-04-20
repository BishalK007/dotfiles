import { Gtk, Widget } from "astal/gtk4";
import { execAsync } from "astal";

const DateFormats = {
    DdMmYyyy: '%d/%m/%Y',
    DdMmYy: '%d/%m/%y',
    YyyyMmDd: '%Y/%m/%d',
    YyMmDd: '%y/%m/%d',
    MmDdYyyy: '%m/%d/%Y',
    MmDdYy: '%m/%d/%y',
    DdMmmYyyy: '%d %b %Y',
    DdMmmYy: '%d %b %y',
    YyyyMmmDd: '%Y %b %d',
    YyMmmDd: '%y %b %d',
};

const DayFormats = {
    FULL: '+%A',
    ABBREVIATED: '+%a',
    SHORT: '+%a',
};

async function getDayString(format: keyof typeof DayFormats) {
    const str = await execAsync(['date', DayFormats[format]]);
    if (format === 'SHORT')
        return str.trim().charAt(0);
    return str.trim();
}

async function getDateString(format: keyof typeof DateFormats) {
    const str = await execAsync(['date', '+' + DateFormats[format]]);
    return str.trim();
}

function computeMidnightDelay() {
    const now = new Date();
    return (
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() -
        now.getTime() +
        1000
    );
}

export default function CalendarWidget({
    dayFormat = 'ABBREVIATED',
    dateFormat = 'DdMmmYyyy',
}: {
    dayFormat?: keyof typeof DayFormats,
    dateFormat?: keyof typeof DateFormats,
} = {}) {
    const dayLabel = Widget.Label({
        label: "",
        cssClasses: ["calendar-day-label"],
        valign: Gtk.Align.CENTER,
    });
    const dateLabel = Widget.Label({
        label: "",
        cssClasses: ["calendar-date-label"],
        valign: Gtk.Align.CENTER,
    });

    async function updateLabels() {
        dayLabel.label = await getDayString(dayFormat);
        dateLabel.label = await getDateString(dateFormat);
    }

    function scheduleMidnightUpdate() {
        setTimeout(async () => {
            await updateLabels();
            scheduleMidnightUpdate();
        }, computeMidnightDelay());
    }

    updateLabels();
    scheduleMidnightUpdate();

    return (
        <menubutton
            valign={Gtk.Align.CENTER}
            cssClasses={["calendar", "calendar-box", "background-color", "border-color"]}
        >
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                valign={Gtk.Align.CENTER}
            >
                <label
                    label=""
                    cssClasses={["calendar-icon"]}
                    valign={Gtk.Align.CENTER}
                />
                {dayLabel}
                {dateLabel}
            </box>
            <popover cssClasses={["calendar", "calendar-popover"]}>
                <Gtk.Calendar cssClasses={["calendar", "calendar-gtk-calendar"]}/>
            </popover>
        </menubutton>
    );
}