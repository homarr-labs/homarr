import { TablerIcon } from '@tabler/icons-react';
import { DocsHeader } from '../ui/header';
import { WidgetDefinition } from '@site/src/types';

interface WidgetHeaderProps {
  widget: WidgetDefinition;
  categories: string[];
}

export const WidgetHeader = (props: WidgetHeaderProps) => {
  return (
    <DocsHeader
      title={props.widget.name}
      description={props.widget.description}
      icon={
        <div className="w-12 h-12 flex justify-center items-center bg-red-500 bg-opacity-10 rounded-md">
          <props.widget.icon size={32} stroke={1.5} className="stroke-red-500" />
        </div>
      }
      categories={props.categories}
    />
  );
};
