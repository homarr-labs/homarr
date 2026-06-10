import React from 'react';
import {
  IconAccessible,
  IconAdjustments,
  IconDragDrop,
  IconIcons,
  IconKey,
  IconLanguage,
  IconPlug,
  TablerIcon,
} from '@tabler/icons-react';

interface Feature {
  icon: TablerIcon;
  title: string;
  content: string;
}

const featureList: Feature[] = [
  {
    icon: IconDragDrop,
    title: 'Easy to use drag and drop system',
    content:
      'Using the drag and drop system, you can simply move parts of your dashboard using your mouse or your finger on mobile devices. No YAML / JSON configurations are involved.',
  },
  {
    icon: IconIcons,
    title: 'Over 10K icons available',
    content:
      'We integrate with many different icon repositories to provide you with high quality and easy to use images.',
  },
  {
    icon: IconPlug,
    title: 'Seamless integrations',
    content:
      'Integrate with your favourite applications to display their status or control them. Scales well with hundreds of users. Robust background job system enables high performance & scalability.',
  },
  {
    icon: IconKey,
    title: 'Authentication & Authorization built in',
    content:
      'Support for credentials authentication, OIDC and LDAP. Complex system to manage permissions for users',
  },
  {
    icon: IconLanguage,
    title: '26 languages available',
    content: 'Accessible for users in many countries thanks to the community translation program',
  },
  {
    icon: IconAdjustments,
    title: 'Detailed settings for customization',
    content:
      'Adjust apps and dashboards until you like them with helpful and easy to understand settings',
  },
];

function FeatureComponent(props: Feature) {
  return (
    <div>
      <div className={'flex flex-nowrap gap-4 items-center mb-2'}>
        <div className={'rounded-xl bg-gray-100 dark:bg-zinc-800 p-3 pb-0.5 aspect-square'}>
          <props.icon size={40} />
        </div>
        <div>
          <h3 className="text-2xl font-extrabold text-gray-700 dark:text-gray-300 m-0">
            {props.title}
          </h3>
          <p className="mb-0 text-base text-gray-500 dark:text-gray-400">{props.content}</p>
        </div>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 mb-32">
      {featureList.map((props, idx) => (
        <FeatureComponent key={idx} {...props} />
      ))}
    </div>
  );
}
