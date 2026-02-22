/**
 * Growth Layer - Context storage
 */

let currentScreen: string | null = null;

export function setGrowthScreen(screen: string | null): void {
  currentScreen = screen;
}

export function getGrowthScreen(): string | null {
  return currentScreen;
}
