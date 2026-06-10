import type React from 'react';
import CodeBlock from '@theme/CodeBlock';
import Admonition from '@theme/Admonition';
import { useEffect, useState } from 'react';

const generateRandomHex = (length = 64): string => {
  const array = new Uint8Array(length / 2);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const DockerInstallSnippet: React.FC = () => {
  const [randomHex, setRandomHex] = useState<string>('');
  const generateNewHex = () => {
    setRandomHex(generateRandomHex());
  };

  useEffect(() => {
    generateNewHex();
  }, []);

  return (
    <div>
      <p>
        First, create a <code>docker-compose.yml</code> file with the following content:
      </p>
      <CodeBlock language="yml" title="docker-compose.yml" className={'argos-ignore'}>
        {`#---------------------------------------------------------------------#
#     Homarr - A simple, yet powerful dashboard for your server.      #
#---------------------------------------------------------------------#
services:
  homarr:
    container_name: homarr
    image: ghcr.io/homarr-labs/homarr:latest
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock # Optional, only if you want docker integration
      - ./homarr/appdata:/appdata
    environment:
      - SECRET_ENCRYPTION_KEY=${randomHex}
    ports:
      - '7575:7575'
			`}
      </CodeBlock>
      <Admonition type="info">
        Key provided above for the <code>SECRET_ENCRYPTION_KEY</code> environment variable is
        randomly generated using your browser cryotography API. It will be different every time You
        can generate one yourself using <code>openssl rand -hex 32</code>
        <button className='px-1 mx-4' onClick={generateNewHex}>Refresh key</button>
      </Admonition>
    </div>
  );
};
