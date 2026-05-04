/**
 * UI Components — Tier A
 * Higher-level composites built on primitives + tokens.
 */

export { Accordion } from "./Accordion";
export type { AccordionProps } from "./Accordion";

export { Avatar } from "./Avatar";
export type { AvatarProps, AvatarSize, AvatarStatus } from "./Avatar";

export { HamburgerMenu } from "./HamburgerMenu";
export type {
    HamburgerMenuProps,
    MenuItem,
    MenuSection
} from "./HamburgerMenu";

export { HelpIcon } from "./HelpIcon";
export type { HelpIconProps, HelpIconSize, HelpIconVariant } from "./HelpIcon";

export { EmptyState } from "./EmptyState";
export type { EmptyStateProps } from "./EmptyState";

export { Header } from "./Header";
export type { HeaderProps } from "./Header";

export { ListItem } from "./ListItem";
export type { ListItemProps } from "./ListItem";

export { ProgressBar } from "./ProgressBar";
export type { ProgressBarProps } from "./ProgressBar";

export { Skeleton } from "./Skeleton";
export type { SkeletonProps } from "./Skeleton";

export { Slider } from "./Slider";
export type { SliderProps } from "./Slider";

export { TabSelector } from "./TabSelector";
export type { TabItem, TabSelectorProps } from "./TabSelector";

export {
    NotificationToastProvider,
    useNotificationToast
} from "./NotificationToast";
export type { NotificationPayload } from "./NotificationToast";

export { ToastProvider, useToast } from "./Toast";

export { SwipeCard } from "./SwipeCard";
export type { SwipeCardItem, SwipeCardProps, SwipeCardRef } from "./SwipeCard";

export { Carousel } from "./Carousel";
export type {
    CarouselIndicator,
    CarouselItem,
    CarouselProps
} from "./Carousel";

export { Stories } from "./Stories";
export type { StoriesProps, StoryItem, StoryUser } from "./Stories";

export { ReviewModal, useReviewSheet } from "./ReviewModal";
export type { ReviewModalProps, ReviewPayload } from "./ReviewModal";

export { StarRating } from "./StarRating";
export type { StarRatingProps, StarRatingSize } from "./StarRating";

export { SplashScreen } from "./SplashScreen";
export type {
    SplashAnimation,
    SplashScreenProps,
    SplashScreenRef
} from "./SplashScreen";

export { Checkbox, CheckboxGroup } from "./Checkbox";
export type {
    CheckboxGroupProps,
    CheckboxProps,
    CheckboxSize
} from "./Checkbox";

// ── i18n-aware components ──
export {
    useConfirmDialog,
    useInfoDialog,
    useLocalizedAlert
} from "./ConfirmDialog";
export { LocalizedText } from "./LocalizedText";
export { RichText } from "./RichText";

