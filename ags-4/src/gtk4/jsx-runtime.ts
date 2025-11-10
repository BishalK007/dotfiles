// // Opt-in bridge so Astal project can use Gnim's runtime + lowercase Gtk tags.

// import Gtk from "gi://Gtk?version=4.0";
// import Astal from "gi://Astal?version=4.0";
// import { CCProps } from "gnim";
// import {
//   intrinsicElements,
//   // re-exported runtime entry points:
//   jsx,
//   jsxs,
//   Fragment,
// } from "gnim/gtk4/jsx-runtime";
// import * as Widget from "astal/gtk4/widget";
// import {
//   BoxProps,
//   ButtonProps,
//   CenterBoxProps,
//   EntryProps,
//   ImageProps,
//   LabelProps,
//   LevelBarProps,
//   MenuButtonProps,
//   OverlayProps,
//   PopoverProps,
//   RevealerProps,
//   SliderProps,
//   StackProps,
//   SwitchProps,
//   WindowProps,
// } from "astal/gtk4/widget";

// // Helper to express prop types: GTK ctor props + Gnim extras ($, onX, bindings)
// type Props<T extends Gtk.Widget, P> = CCProps<T, Partial<P>>;

// // Helper to flatten children arrays and handle Fragments
// function flattenChildren(children: any): any[] {
//   if (children === undefined || children === null) {
//     return [];
//   }

//   // If it's a binding, return it as-is (don't flatten)
//   // Bindings typically have a 'get' method or subscribe method
//   if (typeof children === "object" && children !== null) {
//     // Check if it's a binding (has get/subscribe methods)
//     if (
//       typeof children.get === "function" ||
//       typeof children.subscribe === "function"
//     ) {
//       return [children];
//     }

//     // If it's a GTK Widget, return as-is
//     if (children instanceof Gtk.Widget) {
//       return [children];
//     }

//     // Check if it's a Fragment - use try/catch to safely check for children property
//     try {
//       const hasChildren = Object.prototype.hasOwnProperty.call(
//         children,
//         "children",
//       );
//       if (hasChildren && Array.isArray(children.children)) {
//         return children.children.flatMap(flattenChildren);
//       }
//     } catch (e) {
//       // Ignore errors from property access
//     }
//   }

//   // If it's an array, flatten recursively
//   if (Array.isArray(children)) {
//     return children.flatMap(flattenChildren);
//   }

//   // For primitives or other objects, return as-is
//   return [children];
// }

// // Wrapper functions to bridge gnim and astal
// // These handle the conversion between gnim's prop format and astal's expected format

// function normalizeChildren(props: any): any[] {
//   const { children, child } = props;

//   // If children exists, flatten it
//   if (children !== undefined) {
//     return flattenChildren(children);
//   }

//   // If child exists, flatten it
//   if (child !== undefined) {
//     return flattenChildren(child);
//   }

//   // No children
//   return [];
// }

// function createAstalBox(props: BoxProps) {
//   const { children, child, ...rest } = props;
//   const childArray = normalizeChildren(props);
//   return Widget.Box({ ...rest, children: childArray });
// }

// function createAstalButton(props: any) {
//   const { children, child, ...rest } = props;
//   const childArray = normalizeChildren(props);
//   // only supports a single child, so take the first one
//   if (childArray.length > 0) {
//     return Widget.Button({ ...rest, child: childArray[0] });
//   }
//   return Widget.Button(rest);
// }

// function createAstalCenterBox(props: any) {
//   const { children, child, ...rest } = props;
//   const childArray = normalizeChildren(props);
//   return Widget.CenterBox({ ...rest, children: childArray });
// }

// function createAstalEntry(props: any) {
//   const { children, child, ...rest } = props;
//   // Entry doesn't have children
//   return Widget.Entry(rest);
// }

// function createAstalImage(props: any) {
//   const { children, child, ...rest } = props;
//   // Image doesn't have children
//   return Widget.Image(rest);
// }

// function createAstalLabel(props: any) {
//   const { children, child, ...rest } = props;
//   const childArray = normalizeChildren(props);

//   // Label uses children as text content
//   if (childArray.length > 0) {
//     return Widget.Label({ ...rest, children: childArray });
//   }
//   return Widget.Label(rest);
// }

// function createAstalLevelBar(props: any) {
//   const { children, child, ...rest } = props;
//   // LevelBar doesn't have children
//   return Widget.LevelBar(rest);
// }

// function createAstalMenuButton(props: any) {
//   const { children, child, ...rest } = props;
//   const childArray = normalizeChildren(props);
//   return Widget.MenuButton({ ...rest, children: childArray });
// }

// function createAstalOverlay(props: any) {
//   const { children, child, ...rest } = props;
//   const childArray = normalizeChildren(props);
//   return Widget.Overlay({ ...rest, children: childArray });
// }

// function createAstalPopover(props: any) {
//   const { children, child, ...rest } = props;
//   const childArray = normalizeChildren(props);

//   // Popover supports a single child
//   if (childArray.length > 0) {
//     return Widget.Popover({ ...rest, child: childArray[0] });
//   }
//   return Widget.Popover(rest);
// }

// function createAstalRevealer(props: any) {
//   const { children, child, ...rest } = props;
//   const childArray = normalizeChildren(props);

//   // Revealer supports a single child
//   if (childArray.length > 0) {
//     return Widget.Revealer({ ...rest, child: childArray[0] });
//   }
//   return Widget.Revealer(rest);
// }

// function createAstalStack(props: any) {
//   const { children, child, ...rest } = props;
//   const childArray = normalizeChildren(props);
//   return Widget.Stack({ ...rest, children: childArray });
// }

// function createAstalSwitch(props: any) {
//   const { children, child, ...rest } = props;
//   // Switch doesn't have children
//   return Widget.Switch(rest);
// }

// function createAstalSlider(props: any) {
//   const { children, child, ...rest } = props;
//   // Slider doesn't have children
//   return Widget.Slider(rest);
// }

// function createAstalWindow(props: any) {
//   const { children, child, ...rest } = props;
//   const childArray = normalizeChildren(props);

//   // Window supports a single child
//   if (childArray.length > 0) {
//     return Widget.Window({ ...rest, child: childArray[0] });
//   }
//   return Widget.Window(rest);
// }

// /**
//  * Extend the built-in element map with the lowercase tags you want to use.
//  */
// Object.assign(intrinsicElements, {
//   // --- Astal widgets with wrappers ---
//   box: createAstalBox,
//   button: createAstalButton,
//   centerbox: createAstalCenterBox,
//   entry: createAstalEntry,
//   image: createAstalImage,
//   label: createAstalLabel,
//   levelbar: createAstalLevelBar,
//   menubutton: createAstalMenuButton,
//   overlay: createAstalOverlay,
//   popover: createAstalPopover,
//   revealer: createAstalRevealer,
//   stack: createAstalStack,
//   switch: createAstalSwitch,
//   slider: createAstalSlider,
//   window: createAstalWindow,

//   // --- Pure GTK widgets (no astal version) ---
//   togglebutton: Gtk.ToggleButton,
//   drawingarea: Gtk.DrawingArea,
//   scrolledwindow: Gtk.ScrolledWindow,
// });

// // Type declarations so TSX understands the intrinsic elements
// declare global {
//   namespace JSX {
//     interface IntrinsicElements {
//       box: BoxProps;
//       button: ButtonProps;
//       centerbox: CenterBoxProps;
//       entry: EntryProps;
//       image: ImageProps;
//       label: LabelProps;
//       levelbar: LevelBarProps;
//       menubutton: MenuButtonProps;
//       overlay: OverlayProps;
//       popover: PopoverProps;
//       revealer: RevealerProps;
//       stack: StackProps;
//       switch: SwitchProps;
//       slider: SliderProps;
//       window: WindowProps;

//       togglebutton: Props<Gtk.ToggleButton, Gtk.ToggleButton.ConstructorProps>;
//       drawingarea: Props<Gtk.DrawingArea, Gtk.DrawingArea.ConstructorProps>;
//       scrolledwindow: Props<
//         Gtk.ScrolledWindow,
//         Gtk.ScrolledWindow.ConstructorProps
//       >;
//     }
//   }
// }

// // Re-export runtime so this file *is* the jsxImportSource
// export { jsx, jsxs, Fragment, intrinsicElements };
// export default null as unknown as void;
