<div class="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg border border-gray-200 dark:border-gray-700 divide-gray-200 dark:divide-gray-700 shadow-md dark:!border-gray-600 w-64 text-sm font-light" role="tooltip" tabindex="-1">


    <div class="py-2 px-3 bg-gray-100 rounded-t-md border-b border-gray-200 dark:border-gray-600 dark:bg-gray-700">
        <h3 class="font-semibold text-gray-900 dark:text-white">Действие с выбранным</h3></div>

    {#if selectedKeys.length === 1 && getInfoByKey(selectedKeys[0])?.rest?.length}
        <div class="py-2 px-3">
            <Button color="primary" on:click={handleSplitGroupClick} size="xs">Разъединить группу</Button>
        </div>
        <hr/>
    {:else if allowCombine}
        <div class="py-2 px-3">
            {#if selectedSlotsSameType || selectedType}
                <Checkbox bind:checked={combineToGroup}>Объединить в группу</Checkbox>
            {:else}
                У выбранных слотов разные типы, для объединения выбертите тип
            {/if}

        </div>
        <hr/>
    {/if}

    {#if zone.types.length > 0}
        <div class="py-2 px-3">
            {#each sortedTypes as type}
                <div class="pb-1">
                    <Radio name="selectedType" bind:group={selectedType} value={type}>{type.label}</Radio>
                </div>
            {/each}
            {#if selectedType && selectedType.id !== 0}
                <div class="pl-3">
                    <Button outline class="py-1 border-none" on:click={()=>{selectedType={id:0}}} size="xs">
                        снять назначенный тип
                    </Button>
                </div>
            {/if}

        </div>
        <hr/>
    {/if}
    {#if selectedHasDifferentTags}
        <div class="py-2 px-3">
            У выбранных слотов разные теги, выберите общие:
        </div>
    {/if}
    {#if zone.tags.length > 0}
        <div class="py-2 px-3">
            <div class="pb-2 text-xs">Инструкторы:</div>
            {#each zone.tags.filter(t => !t.label.startsWith('_')) as tag}
                <div class="pb-1">
                    <Checkbox bind:checked={tagsCheckBoxes[tag.id]} on:change={(e)=>handleTagChange(tag,e.target)}>{tag.label}</Checkbox>
                </div>
            {/each}
        </div>
        <hr/>
    {/if}


    <div class="py-2 px-3"><Input bind:value={comment} id="slot-comment" placeholder="Комментарий" size="sm"/></div>
    <hr/>
    <div class="py-2 px-3">
        <Button class="w-full" color="primary" on:click={handleApplyClick} size="xs">Применить</Button>
    </div>

</div>

<script>

  import {Button, Checkbox, Input, Radio} from "flowbite-svelte";

  import {hasChanges, selected, slotsInfo} from "../lib/MainStore.js";
  import {normalizeSlots} from "../lib/mergeIntegrity.js";
  import {createEventDispatcher} from "svelte";


  export let zone;
  export let selectedKeys
  export let allowCombine = true

  $: typeUsage = (() => {
    const counts = {}
    for (const slot of Object.values($slotsInfo)) {
      if (slot.type) counts[slot.type] = (counts[slot.type] || 0) + 1
    }
    return counts
  })()

  $: sortedTypes = zone.types
      .filter(t => !t.label.startsWith('_'))
      .slice()
      .sort((a, b) => (typeUsage[b.id] || 0) - (typeUsage[a.id] || 0))

  $: selectedKeys && drawMenu()

  const dispatch = createEventDispatcher();


  let tagsCheckBoxes = {};


  let combineToGroup = true;

  let selectedSlotsSameType = false;

  function handleSplitGroupClick() {
    splitSelectedSlots()
    const fixed = normalizeSlots($slotsInfo)
    if (fixed.length) console.warn('[slots] normalized after split', fixed)
    dispatch('done', {resetSelected: false});
    $hasChanges = true


  }

  let selectedType = undefined;
  let comment = undefined;
  let selectedHasDifferentTags = false;

  let selectedTags = []

  function handleTagChange(tag, target) {
    if (target.checked) {
      selectedTags.push(tag.id)
    } else {
      selectedTags = selectedTags.filter(t => t !== tag.id)
    }
  }

  function groupSelectedSlotsByDays() {
    const days = {}

    for (let key of selectedKeys) {

      const date = key.split(' ')[0]
      if (!days[date]) days[date] = []
      days[date].push(key)
    }

    let out = []

    for (let d of Object.keys(days)) {
      out.push({date: d, slots: days[d]})
    }
    return out

  }

  function splitSelectedSlots() {


    for (let day of groupSelectedSlotsByDays()) {
      const selectedSlots = day.slots
      // selected = {}

      for (let slotKey of selectedSlots) {
        let slot = getInfoByKey(slotKey)

        slot.length = 1
        delete slot.label

        selected[slotKey] = slot;

        if (!slot.rest) {
          continue
        }
        for (let key of slot.rest) {
          const r = getInfoByKey(key)
          r.length = 1
          delete r.h
          // r.label = r.minute.toString()
          r.label = r.i.m.toString()
          selected[key] = r;
          setInfoByKey(key, r)
        }
        delete slot.rest
        setInfoByKey(slotKey, slot)
      }
    }


  }


  function setValueToSelectedSlots(key, value) {
    for (let slotKey of selectedKeys) {
      const slot = getInfoByKey(slotKey)
      slot[key] = value
      if (slot.rest) {
        for (let rKey of slot.rest) {
          const slot = getInfoByKey(rKey)
          slot[key] = value
          setInfoByKey(rKey, slot)
        }
      }
      setInfoByKey(slotKey, slot)
    }
  }

  function handleApplyClick() {


    if (selectedType) {
      setValueToSelectedSlots('type', selectedType.id === 0 ? undefined : selectedType.id)
    }


    if (combineToGroup && allowCombine) {
      if (!selectedSlotsSameType && !selectedType) {
        console.log('selectedType is not set')
      } else {
        groupSelectedSlots()
      }
    }

    setValueToSelectedSlots('comment', comment)

    setValueToSelectedSlots('tags', selectedTags)

    const fixed = normalizeSlots($slotsInfo)
    if (fixed.length) console.warn('[slots] normalized after apply', fixed)

    dispatch('done', {resetSelected: true});
    $hasChanges = true

  }

  function getTypeById(id) {
    return zone.types.find(t => t.id === id)
  }


  function drawMenu() {

    if (Object.keys(selected).length === 0) {
      return
    }


    selectedType = undefined;

    const comments = new Set()


    const slotTypes = new Set()
    const slotTags = new Set()
    const allTags = new Set()

    selectedKeys.forEach(key => {
      const slot = getInfoByKey(key)

      if (slot.comment) {
        comments.add(slot.comment)
      }
      if (slot.type) {
        slotTypes.add(slot.type)
      }
      if (slot.tags) {
        slotTags.add(slot.tags.sort().join(' ').toString())
        for (let tag of slot.tags) {
          allTags.add(tag)
        }
      }
    })

    comment = undefined
    if (comments.size === 1) {
      comment = comments.values().next().value
    }

    selectedSlotsSameType = slotTypes.size < 2

    if (!selectedSlotsSameType) {
      selectedType = undefined
    }


    if (slotTypes.size === 1) {
      selectedType = getTypeById(slotTypes.values().next().value)
    }

    if (slotTags.size === 1) {
      selectedHasDifferentTags = slotTags.values().next().value.split(' ').map(t => +t.trim())
      selectedTags = Array.from(allTags)
    } else {

      if (slotTags.size === 0) {
        selectedTags = []
      } else {
        selectedTags = Array.from(allTags)
      }
    }
    selectedHasDifferentTags = slotTags.size > 1

    for (let key of Object.keys(tagsCheckBoxes)) {
      tagsCheckBoxes[key] = false
    }

    for (let tag of selectedTags) {

      tagsCheckBoxes[tag] = true
    }


  }

  export function getInfoByKey(key) {
    if (!key) {
      throw new Error('getInfoByKey: key is not set')
    }
    if (typeof key !== 'string') {
      throw new Error('getInfoByKey: key is not string')
    }
    let info = $slotsInfo[key]
    if (!info) {
      const time = key.split(' ')[1]
      return {key, length: 1, i: {h: +time.split(':')[0], m: +time.split(':')[1]}}
    }
    return $slotsInfo[key]
  }

  export function setInfoByKey(key, value) {
    return $slotsInfo[key] = value
  }


  function groupSelectedSlots() {


    for (let day of groupSelectedSlotsByDays()) {
      const selectedSlotsKeys = day.slots

      let firstSlotKey = selectedSlotsKeys[0]
      let firstSlot = getInfoByKey(firstSlotKey)


      let totalLength = firstSlot.length

      let restSlotsKeys = selectedSlotsKeys.slice(1)

      for (let slotKey of restSlotsKeys) {

        const slot = getInfoByKey(slotKey)

        totalLength += slot.length
        if (!firstSlot.rest) firstSlot.rest = []
        firstSlot.rest.push(slotKey)

        if (slot.rest) {
          for (let r of slot.rest) {
            firstSlot.rest.push(r)
          }
          delete slot.rest
        }
        slot.h = true
        setInfoByKey(slotKey, slot)

      }
      firstSlot.length = totalLength

      setInfoByKey(firstSlotKey, firstSlot)

    }
  }

</script>