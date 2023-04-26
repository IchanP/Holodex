import { VideoListFilters, useSettingsStore } from "@/stores/settings";
import { Ref } from "vue";
import { useFavoritesIDSet } from "./favorites";
import dayjs, { Dayjs } from "dayjs";

function filterDeadStreams(video: Video, now: Dayjs) {
  return !(
    !video.start_actual &&
    video.start_scheduled &&
    now.isAfter(dayjs(video.start_scheduled).add(2, "h"))
  );
}

export function useVideoFilter(
  videoList: Ref<{ items: Video[] } | undefined>,
  q: Ref<VideoListLookup>,
  overrides?: Ref<Partial<VideoListFilters>>
): ComputedRef<Video[]> {
  const settings = useSettingsStore();
  const favesList = useFavoritesIDSet();

  return computed(() => {
    const isStreamScheduleOrArchive =
      q.value.type === "stream_schedule" || q.value.type === "archive";

    const isHideCollabStreamsConfigured =
      overrides?.value?.hideCollabStreams ?? settings.hideCollabStreams;

    const isFavoritesOrNotAllVtubers =
      (q.value.flavor as FavLookup)?.favorites ||
      q.value.flavor?.org !== "All Vtubers";

    const shouldHideCollabStreams =
      isStreamScheduleOrArchive &&
      isHideCollabStreamsConfigured &&
      isFavoritesOrNotAllVtubers;

    const shouldFilterDeadStreams =
      q.value.type === "stream_schedule" &&
      (overrides?.value.filterDeadStreams ?? settings.filterDeadStreams);
    const now = shouldFilterDeadStreams && dayjs();

    return (
      videoList.value?.items.filter((x) => {
        let keep = true;

        if (settings.blockedChannels.length > 0) {
          keep &&= !settings.blockedSet.has(x.channel.id);
        }

        if (shouldHideCollabStreams) {
          keep &&= !!(
            x.channel.org == q.value.flavor?.org ||
            favesList.value?.has(x.channel.id)
          );
        }

        if (shouldFilterDeadStreams) {
          keep &&= filterDeadStreams(x, now as Dayjs);
        }

        if (settings.ignoredTopics.length > 0) {
          keep &&= !settings.ignoredTopics.includes(x.topic_id ?? "_N_A");
        }

        if (overrides?.value.ignoredTopics) {
          keep &&= !overrides?.value.ignoredTopics.includes(
            x.topic_id ?? "_N_A"
          );
        }

        return keep;
      }) || []
    );
  });
}
