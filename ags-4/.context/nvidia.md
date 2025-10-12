Now I wanna create a new service:
Name: NvidiaService.tsx

it will poll with interval (default 2s)

on: 
nvidia-smi cmd::
```outputs
bishal@nixos ~/.config/dotfiles/ags-4 [main] $ nvidia-smi -q -x
<?xml version="1.0" ?>
<!DOCTYPE nvidia_smi_log SYSTEM "nvsmi_device_v12.dtd">
<nvidia_smi_log>
	<timestamp>Mon Oct 13 00:25:36 2025</timestamp>
	<driver_version>575.51.02</driver_version>
	<cuda_version>12.9</cuda_version>
	<attached_gpus>1</attached_gpus>
	<gpu id="00000000:01:00.0">
		<product_name>NVIDIA GeForce RTX 4070 Laptop GPU</product_name>
		<product_brand>GeForce</product_brand>
		<product_architecture>Ada Lovelace</product_architecture>
		<display_mode>Requested functionality has been deprecated</display_mode>
		<display_attached>Yes</display_attached>
		<display_active>Enabled</display_active>
		<persistence_mode>Enabled</persistence_mode>
		<addressing_mode>HMM</addressing_mode>
		<mig_mode>
			<current_mig>N/A</current_mig>
			<pending_mig>N/A</pending_mig>
		</mig_mode>
		<mig_devices>
			None
		</mig_devices>
		<accounting_mode>Disabled</accounting_mode>
		<accounting_mode_buffer_size>4000</accounting_mode_buffer_size>
		<driver_model>
			<current_dm>N/A</current_dm>
			<pending_dm>N/A</pending_dm>
		</driver_model>
		<serial>N/A</serial>
		<uuid>GPU-529b3263-c96d-b557-bc75-697f04917eda</uuid>
		<minor_number>0</minor_number>
		<vbios_version>95.06.32.00.49</vbios_version>
		<multigpu_board>No</multigpu_board>
		<board_id>0x100</board_id>
		<board_part_number>N/A</board_part_number>
		<gpu_part_number>2860-775-A1</gpu_part_number>
		<gpu_fru_part_number>N/A</gpu_fru_part_number>
		<platformInfo>
			<chassis_serial_number>N/A</chassis_serial_number>
			<slot_number>N/A</slot_number>
			<tray_index>N/A</tray_index>
			<host_id>N/A</host_id>
			<peer_type>N/A</peer_type>
			<module_id>1</module_id>
			<gpu_fabric_guid>N/A</gpu_fabric_guid>
		</platformInfo>
		<inforom_version>
			<img_version>G002.0000.00.03</img_version>
			<oem_object>2.0</oem_object>
			<ecc_object>N/A</ecc_object>
			<pwr_object>N/A</pwr_object>
		</inforom_version>
		<inforom_bbx_flush>
			<latest_timestamp>N/A</latest_timestamp>
			<latest_duration>N/A</latest_duration>
		</inforom_bbx_flush>
		<gpu_operation_mode>
			<current_gom>N/A</current_gom>
			<pending_gom>N/A</pending_gom>
		</gpu_operation_mode>
		<c2c_mode>N/A</c2c_mode>
		<gpu_virtualization_mode>
			<virtualization_mode>None</virtualization_mode>
			<host_vgpu_mode>N/A</host_vgpu_mode>
			<vgpu_heterogeneous_mode>N/A</vgpu_heterogeneous_mode>
		</gpu_virtualization_mode>
		<gpu_reset_status>
			<reset_required>Requested functionality has been deprecated</reset_required>
			<drain_and_reset_recommended>Requested functionality has been deprecated</drain_and_reset_recommended>
		</gpu_reset_status>
		<gpu_recovery_action>None</gpu_recovery_action>
		<gsp_firmware_version>575.51.02</gsp_firmware_version>
		<ibmnpu>
			<relaxed_ordering_mode>N/A</relaxed_ordering_mode>
		</ibmnpu>
		<pci>
			<pci_bus>01</pci_bus>
			<pci_device>00</pci_device>
			<pci_domain>0000</pci_domain>
			<pci_base_class>3</pci_base_class>
			<pci_sub_class>0</pci_sub_class>
			<pci_device_id>286010DE</pci_device_id>
			<pci_bus_id>00000000:01:00.0</pci_bus_id>
			<pci_sub_system_id>35A81043</pci_sub_system_id>
			<pci_gpu_link_info>
				<pcie_gen>
					<max_link_gen>4</max_link_gen>
					<current_link_gen>2</current_link_gen>
					<device_current_link_gen>2</device_current_link_gen>
					<max_device_link_gen>4</max_device_link_gen>
					<max_host_link_gen>4</max_host_link_gen>
				</pcie_gen>
				<link_widths>
					<max_link_width>8x</max_link_width>
					<current_link_width>8x</current_link_width>
				</link_widths>
			</pci_gpu_link_info>
			<pci_bridge_chip>
				<bridge_chip_type>N/A</bridge_chip_type>
				<bridge_chip_fw>N/A</bridge_chip_fw>
			</pci_bridge_chip>
			<replay_counter>0</replay_counter>
			<replay_rollover_counter>0</replay_rollover_counter>
			<tx_util>6850 KB/s</tx_util>
			<rx_util>29050 KB/s</rx_util>
			<atomic_caps_outbound>N/A</atomic_caps_outbound>
			<atomic_caps_inbound>N/A</atomic_caps_inbound>
		</pci>
		<fan_speed>N/A</fan_speed>
		<performance_state>P5</performance_state>
		<clocks_event_reasons>
			<clocks_event_reason_gpu_idle>Active</clocks_event_reason_gpu_idle>
			<clocks_event_reason_applications_clocks_setting>Not Active</clocks_event_reason_applications_clocks_setting>
			<clocks_event_reason_sw_power_cap>Not Active</clocks_event_reason_sw_power_cap>
			<clocks_event_reason_hw_slowdown>Not Active</clocks_event_reason_hw_slowdown>
			<clocks_event_reason_hw_thermal_slowdown>Not Active</clocks_event_reason_hw_thermal_slowdown>
			<clocks_event_reason_hw_power_brake_slowdown>Not Active</clocks_event_reason_hw_power_brake_slowdown>
			<clocks_event_reason_sync_boost>Not Active</clocks_event_reason_sync_boost>
			<clocks_event_reason_sw_thermal_slowdown>Not Active</clocks_event_reason_sw_thermal_slowdown>
			<clocks_event_reason_display_clocks_setting>Not Active</clocks_event_reason_display_clocks_setting>
		</clocks_event_reasons>
		<clocks_event_reasons_counters>
			<clocks_event_reasons_counters_sw_power_cap>91403239 us</clocks_event_reasons_counters_sw_power_cap>
			<clocks_event_reasons_counters_sync_boost>0 us</clocks_event_reasons_counters_sync_boost>
			<clocks_event_reasons_counters_sw_therm_slowdown>91403239 us</clocks_event_reasons_counters_sw_therm_slowdown>
			<clocks_event_reasons_counters_hw_therm_slowdown>0 us</clocks_event_reasons_counters_hw_therm_slowdown>
			<clocks_event_reasons_counters_hw_power_brake>0 us</clocks_event_reasons_counters_hw_power_brake>
		</clocks_event_reasons_counters>
		<sparse_operation_mode>N/A</sparse_operation_mode>
		<fb_memory_usage>
			<total>8188 MiB</total>
			<reserved>390 MiB</reserved>
			<used>2026 MiB</used>
			<free>5773 MiB</free>
		</fb_memory_usage>
		<bar1_memory_usage>
			<total>8192 MiB</total>
			<used>26 MiB</used>
			<free>8166 MiB</free>
		</bar1_memory_usage>
		<cc_protected_memory_usage>
			<total>0 MiB</total>
			<used>0 MiB</used>
			<free>0 MiB</free>
		</cc_protected_memory_usage>
		<compute_mode>Default</compute_mode>
		<utilization>
			<gpu_util>30 %</gpu_util>
			<memory_util>30 %</memory_util>
			<encoder_util>0 %</encoder_util>
			<decoder_util>0 %</decoder_util>
			<jpeg_util>0 %</jpeg_util>
			<ofa_util>0 %</ofa_util>
		</utilization>
		<encoder_stats>
			<session_count>0</session_count>
			<average_fps>0</average_fps>
			<average_latency>0</average_latency>
		</encoder_stats>
		<fbc_stats>
			<session_count>0</session_count>
			<average_fps>0</average_fps>
			<average_latency>0</average_latency>
		</fbc_stats>
		<dram_encryption_mode>
			<current_dram_encryption>N/A</current_dram_encryption>
			<pending_dram_encryption>N/A</pending_dram_encryption>
		</dram_encryption_mode>
		<ecc_mode>
			<current_ecc>N/A</current_ecc>
			<pending_ecc>N/A</pending_ecc>
		</ecc_mode>
		<ecc_errors>
			<volatile>
				<sram_correctable>N/A</sram_correctable>
				<sram_uncorrectable_parity>N/A</sram_uncorrectable_parity>
				<sram_uncorrectable_secded>N/A</sram_uncorrectable_secded>
				<dram_correctable>N/A</dram_correctable>
				<dram_uncorrectable>N/A</dram_uncorrectable>
			</volatile>
			<aggregate>
				<sram_correctable>N/A</sram_correctable>
				<sram_uncorrectable_parity>N/A</sram_uncorrectable_parity>
				<sram_uncorrectable_secded>N/A</sram_uncorrectable_secded>
				<dram_correctable>N/A</dram_correctable>
				<dram_uncorrectable>N/A</dram_uncorrectable>
				<sram_threshold_exceeded>N/A</sram_threshold_exceeded>
			</aggregate>
			<aggregate_uncorrectable_sram_sources>
				<sram_l2>N/A</sram_l2>
				<sram_sm>N/A</sram_sm>
				<sram_microcontroller>N/A</sram_microcontroller>
				<sram_pcie>N/A</sram_pcie>
				<sram_other>N/A</sram_other>
			</aggregate_uncorrectable_sram_sources>
		</ecc_errors>
		<retired_pages>
			<multiple_single_bit_retirement>
				<retired_count>N/A</retired_count>
				<retired_pagelist>N/A</retired_pagelist>
			</multiple_single_bit_retirement>
			<double_bit_retirement>
				<retired_count>N/A</retired_count>
				<retired_pagelist>N/A</retired_pagelist>
			</double_bit_retirement>
			<pending_blacklist>N/A</pending_blacklist>
			<pending_retirement>N/A</pending_retirement>
		</retired_pages>
		<remapped_rows>
			<remapped_row_corr>0</remapped_row_corr>
			<remapped_row_unc>0</remapped_row_unc>
			<remapped_row_pending>No</remapped_row_pending>
			<remapped_row_failure>No</remapped_row_failure>
			<row_remapper_histogram>
				<row_remapper_histogram_max>64 bank(s)</row_remapper_histogram_max>
				<row_remapper_histogram_high>0 bank(s)</row_remapper_histogram_high>
				<row_remapper_histogram_partial>0 bank(s)</row_remapper_histogram_partial>
				<row_remapper_histogram_low>0 bank(s)</row_remapper_histogram_low>
				<row_remapper_histogram_none>0 bank(s)</row_remapper_histogram_none>
			</row_remapper_histogram>
		</remapped_rows>
		<temperature>
			<gpu_temp>41 C</gpu_temp>
			<gpu_temp_tlimit>46 C</gpu_temp_tlimit>
			<gpu_temp_max_tlimit_threshold>-12 C</gpu_temp_max_tlimit_threshold>
			<gpu_temp_slow_tlimit_threshold>-2 C</gpu_temp_slow_tlimit_threshold>
			<gpu_temp_max_gpu_tlimit_threshold>0 C</gpu_temp_max_gpu_tlimit_threshold>
			<gpu_target_temperature>87 C</gpu_target_temperature>
			<memory_temp>N/A</memory_temp>
			<gpu_temp_max_mem_tlimit_threshold>N/A</gpu_temp_max_mem_tlimit_threshold>
		</temperature>
		<supported_gpu_target_temp>
			<gpu_target_temp_min>N/A</gpu_target_temp_min>
			<gpu_target_temp_max>N/A</gpu_target_temp_max>
		</supported_gpu_target_temp>
		<gpu_power_readings>
			<power_state>P5</power_state>
			<average_power_draw>11.15 W</average_power_draw>
			<instant_power_draw>11.26 W</instant_power_draw>
			<current_power_limit>95.00 W</current_power_limit>
			<requested_power_limit>95.00 W</requested_power_limit>
			<default_power_limit>55.00 W</default_power_limit>
			<min_power_limit>5.00 W</min_power_limit>
			<max_power_limit>140.00 W</max_power_limit>
		</gpu_power_readings>
		<gpu_memory_power_readings>
			<average_power_draw>N/A</average_power_draw>
			<instant_power_draw>N/A</instant_power_draw>
		</gpu_memory_power_readings>
		<module_power_readings>
			<power_state>P5</power_state>
			<average_power_draw>N/A</average_power_draw>
			<instant_power_draw>N/A</instant_power_draw>
			<current_power_limit>N/A</current_power_limit>
			<requested_power_limit>N/A</requested_power_limit>
			<default_power_limit>N/A</default_power_limit>
			<min_power_limit>N/A</min_power_limit>
			<max_power_limit>N/A</max_power_limit>
		</module_power_readings>
		<power_smoothing>N/A</power_smoothing>
		<power_profiles>
			<power_profile_requested_profiles>N/A</power_profile_requested_profiles>
			<power_profile_enforced_profiles>N/A</power_profile_enforced_profiles>
		</power_profiles>
		<clocks>
			<graphics_clock>675 MHz</graphics_clock>
			<sm_clock>675 MHz</sm_clock>
			<mem_clock>810 MHz</mem_clock>
			<video_clock>765 MHz</video_clock>
		</clocks>
		<applications_clocks>
			<graphics_clock>N/A</graphics_clock>
			<mem_clock>N/A</mem_clock>
		</applications_clocks>
		<default_applications_clocks>
			<graphics_clock>N/A</graphics_clock>
			<mem_clock>N/A</mem_clock>
		</default_applications_clocks>
		<deferred_clocks>
			<mem_clock>N/A</mem_clock>
		</deferred_clocks>
		<max_clocks>
			<graphics_clock>3105 MHz</graphics_clock>
			<sm_clock>3105 MHz</sm_clock>
			<mem_clock>8001 MHz</mem_clock>
			<video_clock>2415 MHz</video_clock>
		</max_clocks>
		<max_customer_boost_clocks>
			<graphics_clock>N/A</graphics_clock>
		</max_customer_boost_clocks>
		<clock_policy>
			<auto_boost>N/A</auto_boost>
			<auto_boost_default>N/A</auto_boost_default>
		</clock_policy>
		<voltage>
			<graphics_volt>Requested functionality has been deprecated</graphics_volt>
		</voltage>
		<fabric>
			<state>N/A</state>
			<status>N/A</status>
			<cliqueId>N/A</cliqueId>
			<clusterUuid>N/A</clusterUuid>
			<health>
				<bandwidth>N/A</bandwidth>
				<route_recovery_in_progress>N/A</route_recovery_in_progress>
				<route_unhealthy>N/A</route_unhealthy>
				<access_timeout_recovery>N/A</access_timeout_recovery>
			</health>
		</fabric>
		<supported_clocks>
			<supported_mem_clock>
				<value>8001 MHz</value>
				<supported_graphics_clock>3105 MHz</supported_graphics_clock>
				....More of these <supported_graphics_clock> tags
				<supported_graphics_clock>210 MHz</supported_graphics_clock>
			</supported_mem_clock>
			<supported_mem_clock>
				<value>6001 MHz</value>
				<supported_graphics_clock>3105 MHz</supported_graphics_clock>
				....More of these <supported_graphics_clock> tags
				<supported_graphics_clock>210 MHz</supported_graphics_clock>
			</supported_mem_clock>
			<supported_mem_clock>
				<value>810 MHz</value>
				<supported_graphics_clock>3105 MHz</supported_graphics_clock>
				....More of these <supported_graphics_clock> tags
				<supported_graphics_clock>210 MHz</supported_graphics_clock>
			</supported_mem_clock>
			<supported_mem_clock>
				<value>405 MHz</value>
				<supported_graphics_clock>405 MHz</supported_graphics_clock>
				<supported_graphics_clock>390 MHz</supported_graphics_clock>
				<supported_graphics_clock>375 MHz</supported_graphics_clock>
				<supported_graphics_clock>360 MHz</supported_graphics_clock>
				<supported_graphics_clock>345 MHz</supported_graphics_clock>
				<supported_graphics_clock>330 MHz</supported_graphics_clock>
				<supported_graphics_clock>315 MHz</supported_graphics_clock>
				<supported_graphics_clock>300 MHz</supported_graphics_clock>
				<supported_graphics_clock>285 MHz</supported_graphics_clock>
				<supported_graphics_clock>270 MHz</supported_graphics_clock>
				<supported_graphics_clock>255 MHz</supported_graphics_clock>
				<supported_graphics_clock>240 MHz</supported_graphics_clock>
				<supported_graphics_clock>225 MHz</supported_graphics_clock>
				<supported_graphics_clock>210 MHz</supported_graphics_clock>
			</supported_mem_clock>
		</supported_clocks>
		<processes>
			<process_info>
				<gpu_instance_id>N/A</gpu_instance_id>
				<compute_instance_id>N/A</compute_instance_id>
				<pid>1802</pid>
				<type>G</type>
				<process_name>/run/current-system/sw/bin/Hyprland</process_name>
				<used_memory>1448 MiB</used_memory>
			</process_info>
			<process_info>
				<gpu_instance_id>N/A</gpu_instance_id>
				<compute_instance_id>N/A</compute_instance_id>
				<pid>1890</pid>
				<type>G</type>
				<process_name>Xwayland</process_name>
				<used_memory>23 MiB</used_memory>
			</process_info>
			<process_info>
				<gpu_instance_id>N/A</gpu_instance_id>
				<compute_instance_id>N/A</compute_instance_id>
				<pid>19044</pid>
				<type>G</type>
				<process_name>/nix/store/iy92fqcbwk30f5cjr0cd9g6wljkks27a-google-chrome-139.0.7258.154/share/google/chrome/chrome --type=gpu-process --ozone-platform=wayland --render-node-override=/dev/dri/renderD129 --crashpad-handler-pid=9901 --enable-crash-reporter=a6a0943b-f91b-47ee-b031-9d7872407b91, --user-data-dir=/home/bishal/.config/chrome-apps/gemini --change-stack-guard-on-fork=enable --gpu-preferences=UAAAAAAAAAAgAAAIAAAAAAAAAAAAAGAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAAAAAAAAABgAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAgAAAAAAAAA --shared-files --metrics-shmem-handle=4,i,4142336870751764106,13138256700786331696,262144 --field-trial-handle=3,i,2738489962310013063,16190176451410288102,262144 --enable-features=WaylandWindowDecorations --disable-features=EyeDropper --variations-seed-version</process_name>
				<used_memory>52 MiB</used_memory>
			</process_info>
			<process_info>
				<gpu_instance_id>N/A</gpu_instance_id>
				<compute_instance_id>N/A</compute_instance_id>
				<pid>19047</pid>
				<type>G</type>
				<process_name>/nix/store/iy92fqcbwk30f5cjr0cd9g6wljkks27a-google-chrome-139.0.7258.154/share/google/chrome/chrome --type=gpu-process --ozone-platform=wayland --render-node-override=/dev/dri/renderD129 --crashpad-handler-pid=4985 --enable-crash-reporter=, --change-stack-guard-on-fork=enable --gpu-preferences=UAAAAAAAAAAgAAAIAAAAAAAAAAAAAGAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAAAAAAAAABgAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAgAAAAAAAAA --shared-files --metrics-shmem-handle=4,i,8612690496702654778,10309000924356847896,262144 --field-trial-handle=3,i,4629067192003358569,8890860082453109238,262144 --enable-features=WaylandWindowDecorations --disable-features=EyeDropper --variations-seed-version=20251011-010036.166000</process_name>
				<used_memory>61 MiB</used_memory>
			</process_info>
			<process_info>
				<gpu_instance_id>N/A</gpu_instance_id>
				<compute_instance_id>N/A</compute_instance_id>
				<pid>26307</pid>
				<type>C+G</type>
				<process_name>gjs</process_name>
				<used_memory>9 MiB</used_memory>
			</process_info>
			<process_info>
				<gpu_instance_id>N/A</gpu_instance_id>
				<compute_instance_id>N/A</compute_instance_id>
				<pid>30593</pid>
				<type>G</type>
				<process_name>kitty</process_name>
				<used_memory>39 MiB</used_memory>
			</process_info>
			<process_info>
				<gpu_instance_id>N/A</gpu_instance_id>
				<compute_instance_id>N/A</compute_instance_id>
				<pid>32801</pid>
				<type>G</type>
				<process_name>kitty</process_name>
				<used_memory>39 MiB</used_memory>
			</process_info>
			<process_info>
				<gpu_instance_id>N/A</gpu_instance_id>
				<compute_instance_id>N/A</compute_instance_id>
				<pid>40230</pid>
				<type>G</type>
				<process_name>/nix/store/iy92fqcbwk30f5cjr0cd9g6wljkks27a-google-chrome-139.0.7258.154/share/google/chrome/chrome --type=gpu-process --ozone-platform=wayland --render-node-override=/dev/dri/renderD129 --crashpad-handler-pid=40182 --enable-crash-reporter=de180468-5e33-45a2-90fd-b2556c678f9a, --user-data-dir=/home/bishal/.config/chrome-apps/ytmusic --change-stack-guard-on-fork=enable --gpu-preferences=UAAAAAAAAAAgAAAIAAAAAAAAAAAAAGAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAAAAAAAAABgAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAgAAAAAAAAA --shared-files --metrics-shmem-handle=4,i,3343418547501160232,16249271823058654766,262144 --field-trial-handle=3,i,15243288338317922372,16326030742054999113,262144 --enable-features=WaylandWindowDecorations --disable-features=EyeDropper --variations-seed-version</process_name>
				<used_memory>130 MiB</used_memory>
			</process_info>
		</processes>
		<accounted_processes>
		</accounted_processes>
		<capabilities>
			<egm>disabled</egm>
		</capabilities>
	</gpu>

</nvidia_smi_log>
```

I want a NvidiaService that gives me all these information.. 

then write me a widget on bar like this: (󰾰  My Device)
on click will open a popup like this:

--------------------------------------
..<Other stuff I'll add here later>
Nvidia:
Driver: 575.51.02      CUDA: 12.9
GPU Name: 4070..
Utilisation: %         TEMP °C
Perf:        P0-P5     MEM: ...MiB (..%)
<Processes: (count)> (on click opens another popup that shows all processes)
GPU Name: <if there are more GPUs>
Utilisation: %         TEMP °C
Perf:        P0-P5     MEM: ...MiB (..%)
<Processes: (count)> (on click opens another popup that shows all processes)
--------------------------------------

Processes Popup:
<Process Name clipped to 20chars>  MEM: ...MiB (..%) |  | <-the button can kill the process
<Process Name clipped to 20chars>  MEM: ...MiB (..%) |  | <-the button can kill the process
<Process Name clipped to 20chars>  MEM: ...MiB (..%) |  | <-the button can kill the process


