import { Variable } from "astal";
import { bind } from "astal/binding";
import { Gtk, Widget } from "astal/gtk4";
import { scaleSizeNumber } from "../../utils/utils";
import AstalWp from "gi://AstalWp";

const wireplumber = AstalWp.get_default() as AstalWp.Wp;
const audio = wireplumber.audio;

// SpeakerButton component that binds to is-default
const SpeakerButton = ({ endpoint }: { endpoint: AstalWp.Endpoint }) => {
    return (
        <box
            cssClasses={["sound-popup-sound-list-container"]}
            child={bind(endpoint, "is-default").as((isDefault: boolean) => {
                const desc = endpoint.description ?? "Unknown Device";
                // Truncate to max 20 characters
                const truncated =
                    desc.length > 20 ? desc.slice(0, 17) + "..." : desc;
                return (
                    <button
                        on_clicked={() => endpoint.set_is_default(true)}
                        cssClasses={[
                            "sound-device-btn",
                            isDefault ? "default" : ""
                        ]}
                        child={
                            <box
                                orientation={Gtk.Orientation.HORIZONTAL}
                                hexpand={false}
                            >
                                <label
                                    label={isDefault ? " " : " "}
                                    cssClasses={["sound-popup-check-placeholder"]}
                                />
                                <label label={truncated} />
                            </box>
                        }
                    />
                );
            })}
        />
    );
};

const speakerButtons = Variable.derive(
    [
        bind(audio, "speakers"),
        bind(audio, "default-speaker"),
    ],
    (speakers: AstalWp.Endpoint[], defaultSpeaker: AstalWp.Endpoint | null) => {
        if (!speakers || speakers.length === 0) {
            return [<label label="No speakers found" />];
        }
        // Just return the binding, do NOT call as a function
        return speakers.map((endpoint, i) =>
            SpeakerButton({ endpoint })
        );
    }
);

// MicButton component that binds to is-default
const MicButton = ({ endpoint }: { endpoint: AstalWp.Endpoint }) => {
    return (
        <box
            cssClasses={["sound-popup-mics-list-container"]}
            child={bind(endpoint, "is-default").as((isDefault: boolean) => {
                const desc = endpoint.description ?? "Unknown Device";
                const truncated =
                    desc.length > 20 ? desc.slice(0, 17) + "..." : desc;
                return (
                    <button
                        on_clicked={() => endpoint.set_is_default(true)}
                        cssClasses={[
                            "sound-device-btn",
                            isDefault ? "default" : ""
                        ]}
                        child={
                            <box
                                orientation={Gtk.Orientation.HORIZONTAL}
                                hexpand={false}
                            >
                                <label
                                    label={isDefault ? " " : " "}
                                    cssClasses={["sound-popup-check-placeholder"]}
                                />
                                <label label={truncated} />
                            </box>
                        }
                    />
                );
            })}
        />
    );
};

const micButtons = Variable.derive(
    [
        bind(audio, "microphones"),
        bind(audio, "default-microphone"),
    ],
    (microphones: AstalWp.Endpoint[], defaultMic: AstalWp.Endpoint | null) => {
        if (!microphones || microphones.length === 0) {
            return [<label label="No microphones found" />];
        }
        return microphones.map((endpoint, i) =>
            MicButton({ endpoint })
        );
    }
);

const soundIcon = Variable.derive(
    [
        bind(bind(audio, "default-speaker").get(), "volume"),
        bind(bind(audio, "default-speaker").get(), "mute"),
    ],
    (volume: number, mute: boolean) => {
        print(`Volume: ${volume}, Mute: ${mute}`);
        if (mute) return "";
        if (volume <= 0.33) return "";
        if (volume <= 0.66) return "";
        return "";
    }
);
const soundBtnIconClass = Variable.derive(
    [
        bind(bind(audio, "default-speaker").get(), "volume"),
    ],
    (volume: number) => {
        if (volume <= 1.0) {
            return ["sound-popup-sound-icon"];
        }
        else {
            return ["sound-popup-sound-icon-color-red"];
        }
    }
);

export default function SoundPopup() {
    return (
        <box
            orientation={Gtk.Orientation.VERTICAL}
            spacing={scaleSizeNumber(10)}
            cssClasses={["sound-popover", "sound-popover-container"]}
            halign={Gtk.Align.CENTER}
            valign={Gtk.Align.CENTER}
        >
            {/* Default speaker */}
            <label
                label={
                    bind(bind(audio, "default-speaker").get(), "description").as((desc: string | null) => {
                        if (!desc) return "Unknown Speaker";
                        return desc.length > 20 ? desc.slice(0, 17) + "..." : desc;
                    })
                }
                cssClasses={["sound-popup-title"]}
                halign={Gtk.Align.START}
            />
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                cssClasses={["sound-popup-default-speaker"]}
                hexpand={true}
            >
                <button
                    on_clicked={() => {
                        const defSpeaker = bind(audio, "default-speaker").get();
                        if (defSpeaker) {
                            defSpeaker.set_mute(!defSpeaker.mute);
                        }
                    }}
                    cssClasses={["sound-popup-sound-icon-btn"]}
                    child={
                        <label
                            label={soundIcon()}
                            cssClasses={soundBtnIconClass()}
                            halign={Gtk.Align.START}
                        />
                    }
                />

                <slider
                    cssClasses={["sound-popup-slider"]}
                    value={bind(bind(audio, "default-speaker").get(), "volume")}
                    onChangeValue={(self) => {
                        const endpoint = bind(audio, "default-speaker").get();
                        if (endpoint) {
                            endpoint.volume = self.value;
                        }
                    }}
                    hexpand={true}
                    min={0}
                    max={1.5}
                />
                <label
                    label={bind(bind(audio, "default-speaker").get(), "volume").as((volume: number) => {
                        return `${Math.round(volume * 100)}%`;
                    })}
                    cssClasses={["sound-popup-volume-label"]}
                    halign={Gtk.Align.END}
                />
            </box>
            {/* Default Mic */}
            <label
                label={
                    bind(bind(audio, "default-microphone").get(), "description").as((desc: string | null) => {
                        if (!desc) return "Unknown Microphone";
                        return desc.length > 20 ? desc.slice(0, 17) + "..." : desc;
                    })
                }
                cssClasses={["sound-popup-title"]}
                halign={Gtk.Align.START}
            />
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                cssClasses={["sound-popup-default-mic"]}
                hexpand={true}
            >
                <button
                    on_clicked={() => {
                        const defMic = bind(audio, "default-microphone").get();
                        if (defMic) {
                            defMic.set_mute(!defMic.mute);
                        }
                    }}
                    cssClasses={["sound-popup-sound-icon-btn"]}
                    child={
                        <label
                            label={
                                bind(bind(audio, "default-microphone").get(), "mute").as((mute: boolean) =>
                                    mute ? "" : ""
                                )
                            }
                            cssClasses={["sound-popup-sound-icon"]}
                            halign={Gtk.Align.START}
                        />
                    }
                />
                <slider
                    cssClasses={["sound-popup-slider"]}
                    value={bind(bind(audio, "default-microphone").get(), "volume")}
                    onChangeValue={(self) => {
                        const endpoint = bind(audio, "default-microphone").get();
                        if (endpoint) {
                            endpoint.volume = self.value;
                        }
                    }}
                    hexpand={true}
                />
                <label
                    label={bind(bind(audio, "default-microphone").get(), "volume").as((volume: number) => {
                        return `${Math.round(volume * 100)}%`;
                    })}
                    cssClasses={["sound-popup-mic-label"]}
                    halign={Gtk.Align.END}
                />
            </box>
            {/* Speakers List */}
            <label
                label="Speakers"
                cssClasses={["sound-popup-title"]}
                halign={Gtk.Align.START}
            />
            {audio ? <>{speakerButtons()}</> : <label label="Loading..." />}
            {/* Mics List */}
            <label
                label="Mics"
                cssClasses={["sound-popup-title"]}
                halign={Gtk.Align.START}
            />
            {audio ? <>{micButtons()}</> : <label label="Loading..." />}
        </box>
    );
}