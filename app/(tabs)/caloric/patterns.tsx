/**
 * Patterns Demo Screen
 * Demonstrates: ScreenShell, GlassHeader, SettingsList, ListRow, RetryState,
 * StickyFooterCTA, HamburgerMenu, TabSelector, SwipeCard, Carousel, Stories,
 * ReviewSheet.
 */

import { Redirect, useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Carousel } from "../../../src/ui/components/Carousel";
import { HamburgerMenu } from "../../../src/ui/components/HamburgerMenu";
import { useReviewSheet } from "../../../src/ui/components/ReviewModal";
import { Stories } from "../../../src/ui/components/Stories";
import { SwipeCard } from "../../../src/ui/components/SwipeCard";
import { TabSelector } from "../../../src/ui/components/TabSelector";
import { useToast } from "../../../src/ui/components/Toast";
import { GlassCard } from "../../../src/ui/glass/GlassCard";
import { GlassHeader } from "../../../src/ui/patterns/GlassHeader";
import { ListRow } from "../../../src/ui/patterns/ListRow";
import { RetryState } from "../../../src/ui/patterns/RetryState";
import { ScreenShell } from "../../../src/ui/patterns/ScreenShell";
import {
    SettingsGroup,
    SettingsRow,
} from "../../../src/ui/patterns/SettingsList";
import { StickyFooterCTA } from "../../../src/ui/patterns/StickyFooterCTA";
import { TBadge } from "../../../src/ui/primitives/TBadge";
import { TButton } from "../../../src/ui/primitives/TButton";
import { TDivider } from "../../../src/ui/primitives/TDivider";
import { TSpacer } from "../../../src/ui/primitives/TSpacer";
import { TText } from "../../../src/ui/primitives/TText";

export default function PatternsScreen() {
  const router = useRouter();
  const toast = useToast();
  const openReview = useReviewSheet({
    onSubmit: (review) =>
      toast.show(`${review.rating}★ review submitted!`, "success"),
  });

  const [dateTab, setDateTab] = useState("today");
  const [contentTab, setContentTab] = useState("preview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSide, setMenuSide] = useState<"left" | "right">("left");
  const [retryLoading, setRetryLoading] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [faceIdEnabled, setFaceIdEnabled] = useState(true);

  // DEV-only gate — all hooks must be called before this
  if (!__DEV__) return <Redirect href="/(tabs)/caloric" />;

  return (
    <ScreenShell
      header={
        <GlassHeader
          title="Patterns"
          subtitle="Composable layouts & navigation"
          onBack={() => router.back()}
        />
      }
    >
      <TSpacer size="md" />

      {/* ── SettingsList ── */}
      <TText variant="heading" style={{ marginBottom: 12 }}>
        SettingsList
      </TText>

      <SettingsGroup
        title="Account"
        footer="Manage your account preferences and security settings."
      >
        <SettingsRow
          label="Notifications"
          icon="notifications-outline"
          iconBg="#FF3B30"
          type="toggle"
          value={notifEnabled}
          onToggle={setNotifEnabled}
        />
        <SettingsRow
          label="Dark Mode"
          icon="moon-outline"
          iconBg="#5856D6"
          type="toggle"
          value={darkMode}
          onToggle={setDarkMode}
        />
        <SettingsRow
          label="Language"
          icon="globe-outline"
          iconBg="#5AC8FA"
          type="navigate"
          value="English"
          onPress={() => toast.show("Language")}
        />
        <SettingsRow
          label="Face ID"
          icon="finger-print-outline"
          iconBg="#4CD964"
          type="toggle"
          value={faceIdEnabled}
          onToggle={setFaceIdEnabled}
        />
      </SettingsGroup>

      <SettingsGroup title="Support">
        <SettingsRow
          label="Help Center"
          icon="help-circle-outline"
          type="navigate"
          onPress={() => toast.show("Help Center")}
        />
        <SettingsRow
          label="Send Feedback"
          icon="chatbubble-outline"
          type="navigate"
          onPress={() => toast.show("Feedback")}
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          label="Clear Cache"
          icon="trash-outline"
          type="action"
          destructive
          onPress={() => toast.show("Cache cleared", "success")}
        />
        <SettingsRow
          label="Log Out"
          icon="log-out-outline"
          type="action"
          destructive
          onPress={() => toast.show("Logged out", "warning")}
        />
      </SettingsGroup>

      {/* ── ListRow Variants ── */}
      <TText variant="heading" style={{ marginBottom: 12 }}>
        ListRow Variants
      </TText>
      <GlassCard style={s.section}>
        <ListRow
          title="Profile"
          icon="person-outline"
          subtitle="John Doe"
          onPress={() => toast.show("Profile")}
        />
        <TDivider />
        <ListRow
          title="Storage"
          icon="cloud-outline"
          subtitle="2.4 GB used"
          accessory={<TBadge label="80%" tone="warning" size="sm" />}
          onPress={() => toast.show("Storage")}
        />
        <TDivider />
        <ListRow
          title="Downloads"
          icon="download-outline"
          trailing={<TText color="muted">23 files</TText>}
        />
        <TDivider />
        <ListRow
          title="Version"
          icon="information-circle-outline"
          trailing={<TText color="muted">1.0.0</TText>}
          showChevron={false}
        />
        <TDivider />
        <ListRow
          title="Disabled Row"
          icon="lock-closed-outline"
          disabled
          onPress={() => {}}
        />
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── RetryState ── */}
      <TText variant="heading" style={{ marginBottom: 12 }}>
        RetryState
      </TText>
      <GlassCard style={s.section}>
        <RetryState
          title="Failed to load"
          subtitle="Check your internet connection and try again."
          loading={retryLoading}
          onRetry={() => {
            setRetryLoading(true);
            setTimeout(() => {
              setRetryLoading(false);
              toast.show("Retried successfully!", "success");
            }, 2000);
          }}
        />
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── StickyFooterCTA Demo ── */}
      <TText variant="heading" style={{ marginBottom: 12 }}>
        StickyFooterCTA
      </TText>
      <GlassCard style={s.section}>
        <TText color="secondary" style={{ fontSize: 13, marginBottom: 8 }}>
          Stacked layout:
        </TText>
        <StickyFooterCTA
          label="Save Changes"
          onPress={() => toast.show("Saved!", "success")}
          secondaryLabel="Discard"
          onSecondaryPress={() => toast.show("Discarded")}
          helperText="Your changes will be saved to the cloud."
          style={{ borderTopWidth: 0, paddingBottom: 0 }}
        />
        <TSpacer size="lg" />
        <TText color="secondary" style={{ fontSize: 13, marginBottom: 8 }}>
          Inline layout:
        </TText>
        <StickyFooterCTA
          label="Continue"
          onPress={() => toast.show("Continued!", "success")}
          secondaryLabel="Back"
          onSecondaryPress={() => toast.show("Back")}
          layout="inline"
          style={{ borderTopWidth: 0, paddingBottom: 0 }}
        />
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── TabSelector ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">TabSelector</TText>
        <TSpacer size="md" />
        <TText variant="subheading" color="secondary">
          Date selector
        </TText>
        <TSpacer size="sm" />
        <TabSelector
          tabs={[
            { key: "mon", label: "Mon 16" },
            { key: "yesterday", label: "Yesterday" },
            { key: "today", label: "Today" },
            { key: "tomorrow", label: "Tomorrow" },
            { key: "thu", label: "Thu 20" },
            { key: "fri", label: "Fri 21" },
          ]}
          value={dateTab}
          onChange={setDateTab}
        />
        <TSpacer size="lg" />
        <TText variant="subheading" color="secondary">
          Content tabs
        </TText>
        <TSpacer size="sm" />
        <TabSelector
          tabs={[
            { key: "preview", label: "Preview" },
            { key: "commentary", label: "Commentary" },
            { key: "lineup", label: "Lineup" },
            { key: "stats", label: "Stats" },
          ]}
          value={contentTab}
          onChange={setContentTab}
        />
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── HamburgerMenu ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">Hamburger Menu</TText>
        <TSpacer size="md" />
        <View style={{ flexDirection: "row", gap: 16 }}>
          <TButton
            size="sm"
            variant={menuSide === "left" ? "primary" : "outline"}
            onPress={() => setMenuSide("left")}
          >
            Left
          </TButton>
          <TButton
            size="sm"
            variant={menuSide === "right" ? "primary" : "outline"}
            onPress={() => setMenuSide("right")}
          >
            Right
          </TButton>
        </View>
        <TSpacer size="md" />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <HamburgerMenu
            open={menuOpen}
            onToggle={setMenuOpen}
            side={menuSide}
            header={
              <View>
                <TText variant="heading">Menu</TText>
                <TText color="secondary">Explore the app</TText>
              </View>
            }
            sections={[
              {
                title: "Navigation",
                items: [
                  {
                    key: "home",
                    label: "Home",
                    icon: "home-outline",
                    onPress: () => toast.show("Home"),
                  },
                  {
                    key: "profile",
                    label: "Profile",
                    icon: "person-outline",
                    onPress: () => toast.show("Profile"),
                  },
                  {
                    key: "settings",
                    label: "Settings",
                    icon: "settings-outline",
                    onPress: () => toast.show("Settings"),
                  },
                ],
              },
              {
                title: "Support",
                items: [
                  {
                    key: "help",
                    label: "Help Center",
                    icon: "help-circle-outline",
                    onPress: () => toast.show("Help"),
                  },
                  {
                    key: "feedback",
                    label: "Send Feedback",
                    icon: "chatbubble-outline",
                    onPress: () => toast.show("Feedback"),
                  },
                ],
              },
              {
                items: [
                  {
                    key: "logout",
                    label: "Log Out",
                    icon: "log-out-outline",
                    destructive: true,
                    onPress: () => toast.show("Logged out", "warning"),
                  },
                ],
              },
            ]}
            footer={
              <TText variant="caption" color="muted">
                v1.0.0 · caloric
              </TText>
            }
          />
          <TText color="secondary">← Tap the hamburger icon</TText>
        </View>
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── SwipeCard ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">SwipeCard</TText>
        <TSpacer size="sm" />
        <SwipeCard
          data={[
            {
              key: "1",
              image: "https://picsum.photos/seed/card1/400/600",
              title: "Jessica",
              subtitle: "24",
            },
            {
              key: "2",
              image: "https://picsum.photos/seed/card2/400/600",
              title: "Marcus",
              subtitle: "28",
            },
            {
              key: "3",
              image: "https://picsum.photos/seed/card3/400/600",
              title: "Ava",
              subtitle: "22",
            },
          ]}
          onSwipeRight={(item) => toast.show(`Liked ${item.title}`, "success")}
          onSwipeLeft={(item) => toast.show(`Noped ${item.title}`, "info")}
          onEmpty={() => toast.show("No more cards!", "warning")}
        />
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── Carousel ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">Carousel</TText>
        <TSpacer size="sm" />
        <TText color="muted" style={{ marginBottom: 8 }}>
          Bar indicator
        </TText>
        <Carousel
          data={[
            { key: "c1", image: "https://picsum.photos/seed/car1/600/300" },
            { key: "c2", image: "https://picsum.photos/seed/car2/600/300" },
            { key: "c3", image: "https://picsum.photos/seed/car3/600/300" },
          ]}
          itemHeight={200}
          itemRadius={12}
        />
        <TSpacer size="md" />
        <TText color="muted" style={{ marginBottom: 8 }}>
          Dot indicator
        </TText>
        <Carousel
          data={[
            { key: "d1", image: "https://picsum.photos/seed/dot1/600/300" },
            { key: "d2", image: "https://picsum.photos/seed/dot2/600/300" },
            { key: "d3", image: "https://picsum.photos/seed/dot3/600/300" },
          ]}
          itemHeight={160}
          itemRadius={12}
          indicator="dots"
        />
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── Stories ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">Stories</TText>
        <TSpacer size="sm" />
        <Stories
          data={[
            {
              key: "s1",
              name: "You",
              avatar: "https://i.pravatar.cc/100?u=you",
              stories: [{ image: "https://picsum.photos/seed/story1/400/800" }],
            },
            {
              key: "s2",
              name: "Emma",
              avatar: "https://i.pravatar.cc/100?u=emma",
              stories: [{ image: "https://picsum.photos/seed/story2/400/800" }],
            },
            {
              key: "s3",
              name: "Liam",
              avatar: "https://i.pravatar.cc/100?u=liam",
              stories: [{ image: "https://picsum.photos/seed/story3/400/800" }],
            },
            {
              key: "s4",
              name: "Olivia",
              avatar: "https://i.pravatar.cc/100?u=olivia",
              viewed: true,
              stories: [{ image: "https://picsum.photos/seed/story4/400/800" }],
            },
          ]}
          onStoriesEnd={(u) =>
            toast.show(`Finished ${u.name}'s stories`, "info")
          }
        />
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── Review Sheet ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">Review Sheet</TText>
        <TSpacer size="sm" />
        <TText color="muted">Opens in the bottom sheet with glass blur</TText>
        <TSpacer size="sm" />
        <TButton onPress={openReview}>Write a Review</TButton>
      </GlassCard>

      <TSpacer size="xxl" />
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  section: { padding: 16 },
});
