import { KeyboardEvent, useRef } from 'react';
import {
  BoxProps,
  CompoundStylesApiProps,
  createEventHandler,
  createScopedKeydownHandler,
  polymorphicFactory,
  PolymorphicFactory,
  UnstyledButton,
  useDirection,
  useProps,
} from '@mantine/core';
import { useMergedRef } from '@mantine/hooks';
import { useSectionMenuContext } from './section-menu-context';

export type SectionMenuItemStylesNames = 'item' | 'itemLabel' | 'itemSection';

export interface SectionMenuItemProps
  extends BoxProps,
    CompoundStylesApiProps<SectionMenuItemFactory> {
  /** Item label */
  children?: React.ReactNode;
  childMenu: {
    opened: boolean;
    close: () => void;
    open: () => void;
  };
}

export type SectionMenuItemFactory = PolymorphicFactory<{
  props: SectionMenuItemProps;
  defaultRef: HTMLButtonElement;
  defaultComponent: 'button';
  stylesNames: SectionMenuItemStylesNames;
  compound: true;
}>;

const defaultProps: Partial<SectionMenuItemProps> = {};

export const SectionMenuItem = polymorphicFactory<SectionMenuItemFactory>((props, ref) => {
  const { childMenu, classNames, className, style, styles, vars, children, ...others } = useProps(
    'SectionMenuItem',
    defaultProps,
    props
  );

  const ctx = useSectionMenuContext();
  const { dir } = useDirection();
  const itemRef = useRef<HTMLButtonElement>();
  const itemIndex = ctx.getItemIndex(itemRef.current!);
  const _others: any = others;

  const handleMouseLeave = createEventHandler(_others.onMouseLeave, () => ctx.setHovered(-1));
  const handleMouseEnter = createEventHandler(_others.onMouseEnter, () =>
    ctx.setHovered(ctx.getItemIndex(itemRef.current!))
  );

  const handleFocus = createEventHandler(_others.onFocus, () =>
    ctx.setHovered(ctx.getItemIndex(itemRef.current!))
  );

  const scopedKeydownHandler = createScopedKeydownHandler({
    siblingSelector: '[data-section-menu-item]',
    parentSelector: '[data-section-menu-dropdown]',
    activateOnFocus: false,
    loop: ctx.loop,
    dir,
    orientation: 'vertical',
    onKeyDown: _others.onKeyDown,
  });

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    console.log('hi');
    if (
      (event.key === 'ArrowRight' && dir === 'ltr') ||
      (event.key === 'ArrowLeft' && dir === 'rtl')
    ) {
      childMenu.open();
      return;
    }

    // We don't want to handle keydown event if child menu is opened
    if (childMenu.opened) {
      console.log('hey');
      return;
    }

    console.log('hallo');
    scopedKeydownHandler(event);
  };

  return (
    <UnstyledButton
      {...others}
      unstyled={ctx.unstyled}
      tabIndex={ctx.menuItemTabIndex}
      onFocus={handleFocus}
      {...ctx.getStyles('item', { className, style, styles, classNames })}
      ref={useMergedRef(itemRef, ref)}
      role="menuitem"
      data-section-menu-item
      data-hovered={ctx.hovered === itemIndex ? true : undefined}
      data-mantine-stop-propagation
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
    >
      {children}
    </UnstyledButton>
  );
});
