const ANIMATION_DISABLED_CLASS = 'animations-disabled';

export const applyAnimationPreference = (enabled: boolean) => {
  document.body.classList.toggle(ANIMATION_DISABLED_CLASS, !enabled);
};

export const clearAnimationPreference = () => {
  document.body.classList.remove(ANIMATION_DISABLED_CLASS);
};
