<div
    class="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg border border-gray-200 dark:border-gray-700 divide-gray-200 dark:divide-gray-700 shadow-md dark:!border-gray-600 w-64 text-sm font-light"
    role="tooltip"
    tabindex="-1">


  <div class="py-2 px-3 bg-gray-100 rounded-t-md border-b border-gray-200 dark:border-gray-600 dark:bg-gray-700">
    <h3 class="font-semibold text-gray-900 dark:text-white">Выбранная неделя</h3></div>
  <div class="py-2 px-3">
    <Button class="w-full" color="primary" on:click={handleApplyClick} size="xs">Клонировать в следующую неделю</Button>
  </div>
</div>

<script>
  import {createEventDispatcher} from "svelte";
  import {Button} from "flowbite-svelte";
  import {hasChanges, slotsInfo} from "../lib/MainStore.js";


  const dispatch = createEventDispatcher();

  export let selected

  function handleApplyClick() {

    const selectedWeek = selected.days

    const lastDay = new Date(selectedWeek[selectedWeek.length - 1])

    const nextWeek = []
    for (let i = 1; i < 8; i++) {
      const day = new Date(lastDay.getTime() + (i * 24 * 60 * 60 * 1000))

      nextWeek.push(day.toISOString().split('T')[0])
    }

    for (let i = 0; i < 7; i++) {
      const fromDay = selectedWeek[i]
      const toDay = nextWeek[i]
      for (let key of Object.keys($slotsInfo)) {
        const date = key.split(' ')[0]
        const time = key.split(' ')[1]

        if (date === fromDay) {
          const src = $slotsInfo[date + ' ' + time]
          const trgKey = toDay + ' ' + time

          const trg = JSON.parse(JSON.stringify(src))
          trg.key = trgKey

          if (trg.rest) {
            for (let i = 0; i < trg.rest.length; i++) {
              const rest = trg.rest[i]
              const spl = rest.split(' ')
              trg.rest[i] = toDay + ' ' + spl[1]
            }
          }


          $slotsInfo[trgKey] = trg

        }

      }


    }

    $hasChanges = true

    dispatch('done', {copyToNext: selected});
  }

</script>