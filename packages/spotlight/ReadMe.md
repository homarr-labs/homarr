# Spotlight

Spotlight is the search functionality of Homarr. It can be opened by pressing `Ctrl + K` or `Cmd + K` on Mac. It is a quick way to search for anything in Homarr.

## API

### SpotlightActionData

The [SpotlightActionData](./src/type.ts) is the data structure that is used to define the actions that are shown in the spotlight.

#### Common properties

| Name                           | Type                                                          | Description                                                                         |
| ------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| id                             | `string`                                                      | The id of the action.                                                               |
| title                          | `string \| (t: TranslationFunction) => string`                | The title of the action. Either static or generated with translation function       |
| description                    | `string \| (t: TranslationFunction) => string`                | The description of the action. Either static or generated with translation function |
| icon                           | `string                                        \| TablerIcon` | The icon of the action. Either a url to an image or a TablerIcon                    |
| group                          | `string`                                                      | The group of the action. By default the groups all, web and action exist.           |
| ignoreSearchAndOnlyShowInGroup | `boolean`                                                     | If true, the action will only be shown in the group and not in the search results.  |
| type                           | `'link' \| 'button'`                                          | The type of the action. Either link or button                                       |

#### Properties for links

| Name | Type     | Description                                                                                                |
| ---- | -------- | ---------------------------------------------------------------------------------------------------------- |
| href | `string` | The url the link should navigate to. If %s is contained it will be replaced with the current search query. |

#### Properties for buttons

| Name    | Type                       | Description                                                                               |
| ------- | -------------------------- | ----------------------------------------------------------------------------------------- |
| onClick | `() => MaybePromise<void>` | The function that should be called when the button is clicked. It can be async if needed. |

### useRegisterSpotlightActions

The [useRegisterSpotlightActions](./src/data-store.ts) hook is used to register actions to the spotlight. It takes an unique key and the array of [SpotlightActionData](#SpotlightActionData).

#### Usage

The following example shows how to use the `useRegisterSpotlightActions` hook to register an action to the spotlight.

```tsx
"use client";

import { useRegisterSpotlightActions } from "@homarr/spotlight";

const MyComponent = () => {
  useRegisterSpotlightActions("my-component", [
    {
      id: "my-action",
      title: "My Action",
      description: "This is my action",
      icon: "https://example.com/icon.png",
      group: "web",
      type: "link",
      href: "https://example.com",
    },
  ]);

  return <div>My Component</div>;
};
```

##### Using translation function

```tsx
"use client";

import { useRegisterSpotlightActions } from "@homarr/spotlight";

const MyComponent = () => {
  useRegisterSpotlightActions("my-component", [
    {
      id: "my-action",
      title: (t) => t("some.path.to.translation.key"),
      description: (t) => t("some.other.path.to.translation.key"),
      icon: "https://example.com/icon.png",
      group: "web",
      type: "link",
      href: "https://example.com",
    },
  ]);

  return <div>Component implementation</div>;
};
```

##### Using TablerIcon

```tsx
"use client";

import { IconUserCog } from "tabler-react";

import { useRegisterSpotlightActions } from "@homarr/spotlight";

const UserMenu = () => {
  useRegisterSpotlightActions("header-user-menu", [
    {
      id: "user-preferences",
      title: (t) => t("user.preferences.title"),
      description: (t) => t("user.preferences.description"),
      icon: IconUserCog,
      group: "action",
      type: "link",
      href: "/user/preferences",
    },
  ]);

  return <div>Component implementation</div>;
};
```

##### Using dependency array

```tsx
"use client";

import { IconUserCog } from "tabler-react";

import { useRegisterSpotlightActions } from "@homarr/spotlight";

const ColorSchemeButton = () => {
  const { colorScheme, toggleColorScheme } = useColorScheme();

  useRegisterSpotlightActions(
    "toggle-color-scheme",
    [
      {
        id: "toggle-color-scheme",
        title: (t) => t("common.colorScheme.toggle.title"),
        description: (t) => t(`common.colorScheme.toggle.${colorScheme}.description`),
        icon: colorScheme === "light" ? IconSun : IconMoon,
        group: "action",
        type: "button",
        onClick: toggleColorScheme,
      },
    ],
    [colorScheme],
  );

  return <div>Component implementation</div>;
};
```
