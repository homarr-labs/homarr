import { ReactNode } from 'react';
import { Badge } from '../ui/badge';

interface DocsHeaderProps {
  title: string;
  description: string;
  icon: ReactNode;
  categories: string[];
}

export const DocsHeader = (props: DocsHeaderProps) => {
  return (
    <div className="flex gap-4 mt-4">
      {props.icon}

      <div>
        <div className="flex gap-4 items-center">
          <h1 className="!mb-0 text-4xl">{props.title}</h1>
          <div className="flex gap-2">
            {props.categories.map((category) => (
              <Badge>{category}</Badge>
            ))}
          </div>
        </div>
        <p>{props.description}</p>
      </div>
    </div>
  );
};
