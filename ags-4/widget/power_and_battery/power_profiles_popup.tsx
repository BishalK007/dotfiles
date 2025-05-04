import { Variable } from "astal";
import { bind } from "astal/binding";
import { Gtk } from "astal/gtk4";
import AstalPowerProfiles from "gi://AstalPowerProfiles";

const power_profiles = AstalPowerProfiles.get_default() as AstalPowerProfiles.PowerProfiles;

export default function PowerProfilesPopup() {
    // print("profiles:: ", power_profiles.get_profiles());
    return (
        <box
            orientation={Gtk.Orientation.VERTICAL}
            spacing={0}
            cssClasses={["power-profile-popover-container"]}
            valign={Gtk.Align.CENTER}
            halign={Gtk.Align.CENTER}
            >
            <label
                label="Power Profiles:"
                cssClasses={["power-profile-top-label"]}
                halign={Gtk.Align.START}
            />
            {power_profiles.get_profiles().map((powerProfile: AstalPowerProfiles.Profile) => {
                const profileType = powerProfile.profile;
                return (
                    <button
                        // key={profileType}
                        cssClasses={["power-profile-button"]}
                        onClicked={() => {
                            power_profiles.activeProfile = powerProfile.profile;
                        }}
                        
                    >
                        <box
                            orientation={Gtk.Orientation.HORIZONTAL}
                            spacing={0}
                            cssClasses={["power-profile-button-box"]}
                            valign={Gtk.Align.CENTER}
                            halign={Gtk.Align.START}
                        >
                            <label
                                label={bind(power_profiles, "activeProfile").as((activeProfile) => {
                                    if (activeProfile === powerProfile.profile) {
                                        return " "
                                    }
                                    return " "
                                })}
                            />
                            <label
                                label={profileType
                                    .split('-')
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(' ')
                                }
                                cssClasses={["power-profile-label"]}
                                valign={Gtk.Align.CENTER}
                                halign={Gtk.Align.START}
                            />
                        </box>

                    </button>
                );
            }
            )}
        </box>
    );
}