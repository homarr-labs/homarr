import videoLight from './showcase-light.mp4';
import videoDark from './showcase-dark.mp4';
import { IconClick } from '@tabler/icons-react';
import { SectionContainer } from '@site/src/components/pages/home/container/section-container';
import { useColorMode } from '@docusaurus/theme-common';

export const DragAndDropShowcase = () => {
  const { colorMode } = useColorMode();
  const video = colorMode === 'dark' ? videoDark : videoLight;
  return (
    <div className={'my-24'}>
      <SectionContainer className={"relative max-w-5xl"}>
        <h2 className={'lg:text-5xl text-3xl font-extrabold text-center mb-12'}>Easy setup using drag and drop</h2>
        <div className={'absolute top-0 right-0 translate-x-10 translate-y-8 hidden lg:block'}>
          <IconClick size={120} />
        </div>
        <div className={'rounded-3xl overflow-hidden border-8 border-red-500 border-solid'} style={{ aspectRatio: '17.6/9' }}>
          <video className={'w-full'} src={video} autoPlay loop muted />
        </div>
      </SectionContainer>
    </div>
  );
};