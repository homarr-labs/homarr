import { splitToNChunks } from '@site/src/tools/array';
import classes from './available-integrations.module.css';
import { SectionContainer } from '@site/src/components/pages/home/container/section-container';
import { supportedIntegrations } from '@site/src/constants/supported-integrations';

const countIconGroups = 3;
const animationDurationInSeconds = 12;

export const AvailableIntegrations = () => {
  const arrayInChunks = splitToNChunks(supportedIntegrations.map(integration => integration.iconUrl), countIconGroups);

  return (
    <SectionContainer className={'my-24'}>
      <div className={'md:h-80 w-full dark:bg-neutral-900 p-10 rounded-3xl overflow-hidden relative'}>
        <div className={'flex gap-10 flex-nowrap'}>
          <div className={'md:w-1/2 w-full'}>
            <h2 className={'lg:text-5xl text-3xl font-extrabold '}>Many integrations built in</h2>
            <p className={'text-xl text-gray-500 dark:text-gray-400'}>Homarr has support for tons of your favourite
              applications, tools and websites. It integrates seamlessly and tests proper connectivity and configuration
              for you. Using the tasks system, it scales efficiently with tons of users, making Homarr reliable in big
              scale deployments too.</p>
          </div>
          <div className={'rotate-12 w-1/2 hidden md:block argos-ignore'}>
            <div className={'grid gap-12 grid-cols-3'}>
              {Array(countIconGroups)
                .fill(0)
                .map((_, columnIndex) => (
                  <div key={`grid-column-${columnIndex}`} style={{ width: 50 }}>
                    <div
                      className={classes.scrollAnimationContainer}
                      style={{
                        animationDuration: `${animationDurationInSeconds - columnIndex}s`,
                      }}
                    >
                      {arrayInChunks[columnIndex]?.map((icon, index) => (
                        <img className={'rounded'} key={`grid-column-${columnIndex}-scroll-1-${index}`} src={icon}
                             width={50} height={50} />
                      ))}

                      {/* This is used for making the animation seem seamless */}
                      {arrayInChunks[columnIndex]?.map((icon, index) => (
                        <img className={'rounded'} key={`grid-column-${columnIndex}-scroll-2-${index}`} src={icon}
                             width={50} height={50} />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

    </SectionContainer>
  );
};