<main bind:this={main} style="padding:10px">
  <canvas bind:this={canvas} height={canvasHeight} id="canvas" width={canvasWidth} style="background:#fff; display:block"></canvas>
  {#if debugMode}
    <!--        <div class="mt-2 text-gray-500" style="font-size: 8px">-->
    <!--            <pre>checkboxes: {JSON.stringify(tagsCheckBoxes)}</pre>-->
    <!--        </div>-->
    <!--        <div class="mt-2 text-gray-500" style="font-size: 8px">-->
    <!--            <pre>selectedSlots: {JSON.stringify(selectedSlots)}</pre>-->
    <!--        </div>-->
    <!--        <div class="mt-2 text-gray-500" style="font-size: 8px">-->
    <!--            <pre>selectedTags: {JSON.stringify(selectedTags)}</pre>-->
    <!--        </div>-->

    <div class="mt-2 text-gray-500" style="font-size: 8px">
      {#each Object.keys($slotsInfo).sort() as key}
        <pre>{key}: {JSON.stringify($slotsInfo[key])}</pre>
      {/each}
    </div>
  {/if}
  {#if menuOpen}
    <div on:mousedown|preventDefault|stopPropagation={backdropClick}
         on:touchstart|preventDefault|stopPropagation={backdropClick}
         style="position:fixed; inset:0; background:rgba(0,0,0,0.15); z-index:40"></div>
  {/if}

  <div bind:this={menuEl} style="position:fixed; z-index:50; left:{menuPosition.x}px; top:{menuPosition.y}px;">
    <Menu zone={zone} on:done={menuActionDone} selectedKeys={selectedKeys}/>
  </div>

  <div bind:this={weekMenuEl} style="position:fixed; z-index:50; left:{weekMenuPosition.x}px; top:{weekMenuPosition.y}px;">
    <WeekMenu on:done={weekMenuActionDone} selected={lastWeekSelection}/>
  </div>

</main>

<script>
  import {onMount} from 'svelte';
  import Menu from "./Menu.svelte";
  import WeekMenu from "./WeekMenu.svelte"
  import {hasChanges, slotsInfo} from "../lib/MainStore.js";
  import {apiService} from "../lib/api.js";
  import {SPOT_DURATION, SLOTS_PER_HOUR, MINUTES, START_HOUR, WORK_HOURS} from "../lib/constants.js";


  export const reset = () => {
    selected = {}
    render()
  }

  export let selectedTag;


  let menuPosition = {x: -1000, y: -1000};
  let weekMenuPosition = {x: -1000, y: -1000};
  let menuOpen = false;
  // let menuPosition = {x: 0, y: -0};

  export let zone;


  $: selectedKeys = Object.keys(selected) ? getSelectedKeys() : []

  export let fromDate;
  let toDate = new Date(fromDate)
  toDate.setMonth(toDate.getMonth() + 1)
  let maxDate = toDate.toJSON().slice(0, 10)


  let canvas;

  const oddFill = '#ebe6e0'
  const evenFill = '#fcf7f1'

  const paddingLeft = 65
  export let slotSizeX
  export let slotSizeY
  export let daysCount

  try {
    let x = localStorage.getItem('slotSizeX')
    if (x && !isNaN(+x)) {
      slotSizeX = +x
    }
  } catch (e) {
    console.log(e)
  }

  try {
    let y = localStorage.getItem('slotSizeY')
    if (y && !isNaN(+y)) {
      slotSizeY = +y
    }
  } catch (e) {
    console.log(e)
  }

  const startHour = START_HOUR
  const workHours = WORK_HOURS
  const weekPadding = 5
  const rowH = slotSizeY
  const defaultTextColor = '#aaa';
  const defaultSlotBorderColor = '#777';


  let main = document.getElementById('main');

  const canvasWidth = workHours * SLOTS_PER_HOUR * slotSizeX + paddingLeft

  $: weeksCount = Math.max(Math.ceil(daysCount / 7), 1)
  $: normalizedDaysCount = weeksCount * 7
  // start is always Monday, so there is exactly one Sunday per week
  $: canvasHeight = weekPadding + normalizedDaysCount * rowH + weeksCount * weekPadding + 2


  let days = []
  const today = new Date()


  function startOfWeek(d) {
    const date = new Date(d)
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
    return date
  }

  function getDateString(d) {
    const year = d.getFullYear(); // Get the year (e.g., 2023)
    const month = (d.getMonth() + 1).toString().padStart(2, '0'); // Get the month (0-11) and add 1, then pad with leading zero if needed
    const day = d.getDate().toString().padStart(2, '0'); // Get the day of the month and pad with leading zero if needed

    return `${year}-${month}-${day}`
  }

  function handleDateChange() {
    const frDate = startOfWeek(fromDate)
    toDate = new Date(maxDate)


    const loc_days = []
    for (let i = 0; i < normalizedDaysCount; i++) {
      const d = new Date(frDate.getTime() + (i * 24 * 60 * 60 * 1000));
      const key = getDateString(d)
      loc_days.push({
        key,
        label: d.toLocaleDateString('ru-RU', {weekday: 'short', day: 'numeric', month: 'short'}),
        date: d,
        slots: []
      })
    }
    days = loc_days

    for (let day of days) {
      for (let i = 0; i < workHours; i++) {
        for (let j = 0; j < SLOTS_PER_HOUR; j++) {
          const hour = i + startHour;
          const minute = j * SPOT_DURATION;
          const length = 1;// Math.round(Math.random()*2)+1;
          const label = minute.toString();
          const str_date = day.date.toISOString().split('T')[0]
          day.slots.push({
            key: `${str_date} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
            label,
            hour,
            minute,
            length
          });
        }
      }
    }
    render()
    getSlots()

  }

  function menuActionDone(e) {
    if (e.detail.resetSelected) {
      selected = {}
    }
    render()
  }


  //
  // function handleWeekMove(delta) {
  //   startDate = new Date(startDate.getTime() + (7 * delta * 24 * 60 * 60 * 1000));
  //   const loc_days = []
  //   for (let i = 0; i < 24; i++) {
  //     const d = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
  //     const key = getDateString(d)
  //     loc_days.push({
  //       key,
  //       label: d.toLocaleDateString('ru-RU', {weekday: 'short', day: 'numeric', month: 'long'}),
  //       date: d,
  //       slots: []
  //     })
  //   }
  //   days = loc_days
  // }
  //
  // handleWeekMove(0)


  let menuEl;
  let weekMenuEl;


  function getSelectedKeys() {
    const slots = []
    for (let slot of Object.values(selected)) {
      for (let day of days) {
        const found = day.slots.find(s => s.key === slot.key)
        if (!found) continue
        slots.push(found.key)
      }
    }
    return slots
  }


  let rectangles = [];
  let selected = {}


  function findIntersections(selection) {
    const intersections = [];

    selected = {}


    function intersect(rect1, rect2) {
      return (
          rect1.x < rect2.x + rect2.width &&
          rect1.x + rect1.width > rect2.x &&
          rect1.y < rect2.y + rect2.height &&
          rect1.y + rect1.height > rect2.y
      );
    }

    for (let j = 0; j < rectangles.length; j++) {
      if (intersect(selection, rectangles[j])) {
        intersections.push(rectangles[j]);
      }
    }
    for (let r of intersections) {
      selected[r.key] = r;
    }

    return intersections;
  }

  function hideMenu() {
    menuPosition.x = -1000;
    menuPosition.y = -1000;
    weekMenuPosition.x = -1000;
    weekMenuPosition.y = -1000;
    menuOpen = false;
  }

  function backdropClick() {
    hideMenu()
    lastWeekSelection = null
    render()
  }

  function drawMenu() {
    let lastSelected = {x: 0, y: 0};
    let lastSelectedTopRow = {x: 0, y: 0};

    Object.values(selected).forEach(rect => {
      if (rect.x >= lastSelected.x && rect.y >= lastSelected.y) {
        lastSelected = rect
      }
      if (lastSelectedTopRow.y === 0 || (rect.x >= lastSelectedTopRow.x && rect.y <= lastSelectedTopRow.y)) {
        lastSelectedTopRow = rect
      }
    });

    const canvasPosition = canvas.getBoundingClientRect()
    const menuBoundData = menuEl.getBoundingClientRect()

    let x = canvasPosition.left + lastSelected.x - 48
    let y = canvasPosition.top + lastSelected.y + slotSizeY + 4

    if (x + menuBoundData.width > window.innerWidth - 12) {
      x = window.innerWidth - menuBoundData.width - 12
    }
    if (y + menuBoundData.height > window.innerHeight - 12) {
      y = canvasPosition.top + lastSelectedTopRow.y - menuBoundData.height - 8
    }

    if (x < 12) x = 12
    if (y < 12) y = 12

    menuPosition.x = x
    menuPosition.y = y
    menuOpen = true
  }


  function render() {
    hideMenu()
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawDates()
    drawHeader()
    drawTimeline()
  }

  const weeks = []

  function drawDates() {
    weeks.length = 0
    ctx.font = "11px Rubik";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const datesPaddingLeft = paddingLeft;

    let y = weekPadding;

    let startY = y
    let weekDays = []

    for (let i = 0; i < days.length; i++) {
      weekDays.push(days[i].key)
      const day = days[i]
      const dow = day.date.getDay()
      y += rowH;
      // ctx.strokeStyle = 'black';
      ctx.fillStyle = '#FFF';
      ctx.fillRect(0, y, datesPaddingLeft, rowH);
      ctx.fillStyle = '#000';

      if (dow === 6 || dow === 0) {
        ctx.fillStyle = '#FF0000';
      }

      ctx.fillText(day.label, datesPaddingLeft / 2, y + rowH / 2 + 2);

      if (selectedTag) {
        ctx.globalAlpha = 0.2
      }

      ctx.strokeStyle = '#ddd';

      if (dow === 0) {
        ctx.beginPath();
        ctx.moveTo(25, y + rowH + 2);
        ctx.lineTo(datesPaddingLeft - 25, y + rowH + 2);
        ctx.stroke();

      }

      ctx.globalAlpha = 1

      if (dow === 0) {
        y += weekPadding
        weeks.push({y, startY, days: weekDays})
        weekDays = []
        startY = y

      }
    }

  }

  function drawHeader() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = "13px Rubik";
    const width = slotSizeX * SLOTS_PER_HOUR
    const height = slotSizeY;
    ctx.strokeStyle = defaultSlotBorderColor;
    for (let i = 0; i < workHours; i++) {
      ctx.fillStyle = i % 2 === 0 ? evenFill : oddFill;
      const x = paddingLeft + i * width;
      const y = 0;
      // ctx.fillRect(x, 0, width, height * (days.length + 1));
      // ctx.strokeStyle = 'black';
      ctx.fillRect(x, 0, width, height);
      ctx.strokeRect(x, 0, width, height);
      ctx.fillStyle = '#000000';
      ctx.fillText(i + startHour, x + width / 2, y + height / 2);
      //   ctx.strokeStyle = 'black';
      //   ctx.beginPath();
      //   ctx.moveTo(x, y);
      //   ctx.lineTo(x, y + height);
      //   ctx.stroke();
      //   ctx.beginPath();
      //   ctx.moveTo(x, y);
      //   ctx.lineTo(width, y);
      //   ctx.stroke();
    }
  }

  function drawTimeline() {
    rectangles = []
    let y = weekPadding;
    for (let i = 0; i < days.length; i++) {
      y += rowH
      const day = days[i]
      drawOneLine(day, y)

      if (day.date.getDay() === 0) {
        y += weekPadding
      }
    }
    ctx.globalAlpha = 1
  }


  export function getInfoByKey(key) {
    if (!key) {
      throw new Error('getInfoByKey: key is not set')
    }
    let info = $slotsInfo[key]
    if (!info) {
      const time = key.split(' ')[1]
      return {key, length: 1, i: {h: +time.split(':')[0], m: +time.split(':')[1]}}
    }
    return $slotsInfo[key]
  }

  function getTypeById(id) {
    return zone.types.find(t => t.id === id)
  }

  function genLabel(info, daySlot) {

    if (info.length === 1) {
      return info.i.m
    }

    const fromHour = info.i.h.toString().padStart(2, '0')
    const fromMinute = info.i.m.toString().padStart(2, '0')

    let toHour = info.i.h
    let toMinute = info.i.m

    for (let i = 0; i < info.length; i++) {
      toMinute += SPOT_DURATION
      if (toMinute > 59) {
        toMinute = 0
        toHour += 1
      }
    }

    toHour = toHour.toString().padStart(2, '0')
    toMinute = toMinute.toString().padStart(2, '0')

    let label = info.i.m.toString()

    if (info.length > 1 && info.length < SLOTS_PER_HOUR) {
      label = `${fromMinute}-${toMinute}`
    } else if (info.length < SLOTS_PER_HOUR + 1) {
      label = `${fromHour}:${fromMinute}-${toHour}:${toMinute}`
    } else {
      label = `${fromHour}:${fromMinute} - ${toHour}:${toMinute}`
    }

    return label
  }


  function drawOneLine(day, y) {

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';


    let i = 0;
    for (let daySlot of day.slots) {

      const info = getInfoByKey(daySlot.key)
      if (info.h) {
        
        continue
      }

      if (info.length === 3) {
        ctx.font = "10px Rubik";
      } else {
        ctx.font = "11px Rubik";
      }

      ctx.setLineDash([0]);

      ctx.lineWidth = 1
      const rect = {
        x: i * slotSizeX + paddingLeft,
        y: y,
        width: slotSizeX * info.length,
        height: slotSizeY,
        key: daySlot.key
      }
      i = i + info.length;

      let textColor = defaultTextColor;
      ctx.globalAlpha = 1
      ctx.fillStyle = info.i.h % 2 === 0 ? evenFill : oddFill;
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

      if (selectedTag) {
        ctx.globalAlpha = 0.2
        if (info.tags && info.tags.length > 0) {
          if (info.tags.includes(selectedTag.id)) {
            ctx.globalAlpha = 1
          }
        }
      }

      ctx.strokeStyle = defaultSlotBorderColor;


      if (info.type) {
        const type = getTypeById(info.type)
        ctx.fillStyle = type.color;
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        textColor = '#ffffff';
        ctx.strokeStyle = 'black';
      }

      if (selected[daySlot.key]) {
        textColor = '#000';
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.setLineDash([4, 2]);
      }

      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
      const textX = rect.x + rect.width / 2;
      const textY = rect.y + rect.height / 2 + 1;
      ctx.fillStyle = textColor;
      ctx.fillText(genLabel(info, daySlot), textX, textY);

      if (daySlot.minute === 0) {
        ctx.setLineDash([0]);
        ctx.strokeStyle = 'black';
        ctx.beginPath();
        ctx.moveTo(rect.x, rect.y);
        ctx.lineTo(rect.x, rect.y + rect.height);
        ctx.stroke();

      }

      rectangles.push(rect);
    }
  }

  let ctx;

  let isDrawing = false;
  let startX, startY;

  let prevSelection;


  function onMousseUp(e) {
    if (menuOpen) return;
    if (!isDrawing) return;
    isDrawing = false;
    let mouseX = e.layerX - canvas.offsetLeft;
    let mouseY = e.layerY - canvas.offsetTop;

    if (isSafari) {
      mouseX = e.layerX
      mouseY = e.layerY
    }


    const width = mouseX - startX;
    const height = mouseY - startY;

    const selection = ({x: startX, y: startY, width, height});

    if (selection.width < 0) {
      selection.x = selection.x + selection.width;
      selection.width = -selection.width;
    }

    if (selection.height < 0) {
      selection.y = selection.y + selection.height;
      selection.height = -selection.height;
    }
    findIntersections(selection);

    const selectedStr = JSON.stringify(selected);

    if (selectedStr === prevSelection) {
      selected = {};
      prevSelection = null;
      render();
      return;
    }

    prevSelection = selectedStr;

    render();
    if (Object.keys(selected).length) {
      drawMenu();
    } else {
      hideMenu()
    }

  };


  function weekMenuActionDone(e) {
    lastWeekSelection = null
    hideMenu()
    console.log('weekMenuActionDone', e.detail)

      $hasChanges = true
      render()


  }

  let lastWeekSelection = null

  function drawWeekSelection(week) {
    if (menuOpen) return;
    if (lastWeekSelection && lastWeekSelection.days[0] === week.days[0]) return;

    if (menuPosition.x > 0) {
      return
    }
    // hideMenu()
    render()

    lastWeekSelection = week
    ctx.fillStyle = `rgba(0, 150, 255, 0.2)`;

    ctx.strokeStyle = "red";

    ctx.beginPath();
    ctx.roundRect(1, week.startY + rowH + 1, paddingLeft - 4, week.days.length * rowH - 2, 4);
    ctx.closePath();

    // Fill the shape
    ctx.fill();


  }

  function onMouseEmptyMove(mouseX, mouseY) {

    if (mouseX < paddingLeft) {
      for (let week of weeks) {
        if (mouseY > week.startY + rowH && mouseY <= week.y + rowH) {
          drawWeekSelection(week)
          return
        }
      }
    } else {
      if (lastWeekSelection !== null) {
        lastWeekSelection = null
        render()
      }
    }

  }


  function onMousseMove(e) {

    if (menuOpen) return;

    e.preventDefault();

    let mouseX = e.layerX - canvas.offsetLeft;
    let mouseY = e.layerY - canvas.offsetTop;

    if (isSafari) {
      mouseX = e.layerX
      mouseY = e.layerY
    }

    if (!isDrawing) return onMouseEmptyMove(mouseX, mouseY);

    const width = mouseX - startX;
    const height = mouseY - startY;

    lastWeekSelection = null
    render();
    ctx.strokeStyle = 'blue';
    ctx.strokeRect(startX, startY, width, height);
  }


  function drawWeekMenu(mouseX, mouseY, week) {
    const canvasPosition = canvas.getBoundingClientRect()

    let x = canvasPosition.left + mouseX + 8
    let y = canvasPosition.top + mouseY + 8

    if (weekMenuEl) {
      const menuBoundData = weekMenuEl.getBoundingClientRect()
      if (x + menuBoundData.width > window.innerWidth - 12) {
        x = window.innerWidth - menuBoundData.width - 12
      }
      if (y + menuBoundData.height > window.innerHeight - 12) {
        y = canvasPosition.top + mouseY - menuBoundData.height - 8
      }
    }

    weekMenuPosition.x = Math.max(x, 12)
    weekMenuPosition.y = Math.max(y, 12)
    menuOpen = true
  }


  function onMouseDown(e) {

    if (menuOpen) return;

    if (isSafari) {
      startX = e.layerX
      startY = e.layerY
    } else {
      startX = e.layerX - canvas.offsetLeft;
      startY = e.layerY - canvas.offsetTop;
    }


    if (lastWeekSelection !== null && startX < paddingLeft) {
      drawWeekMenu(startX, startY, lastWeekSelection)
      return
    }


    hideMenu()
    isDrawing = true;
    e.preventDefault();


  }


  function beforeRender() {


    ctx = canvas.getContext('2d');
    const ratio = window.devicePixelRatio || 1;
    if (ratio > 1) {
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      canvas.width = canvasWidth * ratio;
      canvas.height = canvasHeight * ratio;
      canvas.style.width = canvasWidth + "px";
      canvas.style.height = canvasHeight + "px";
      ctx.scale(ratio, ratio);
    }


    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('touchstart', onMouseDown);

    // canvas.addEventListener('mousemove', onMousseMove);

    // canvas.addEventListener('mouseup', onMousseUp);
    // canvas.addEventListener('mouseout', onMousseUp);


  }

  let debugMode = false;

  const isSafari = (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1)

  onMount(() => {
    debugMode = window.location.hash.indexOf('debug') > -1


    beforeRender();
    handleDateChange();

    window.addEventListener('mouseup', onMousseUp);
    window.addEventListener('mousemove', onMousseMove);

    window.addEventListener('touchend', onMousseUp);
    window.addEventListener('touchmove', onMousseMove);

  });

  function getSlots() {
    const startDate = startOfWeek(fromDate)
    const maxDate = getDateString(new Date(startDate.getTime() + (normalizedDaysCount * 24 * 60 * 60 * 1000)))

    apiService.getSlots(zone.id, getDateString(startDate), maxDate).then(savedSlots => {
      console.group('getSlots')
      console.log('selectedZoneId', zone.id)
      console.log('slots', savedSlots)
      console.groupEnd()

      const savedSlotsMap = Object.fromEntries(savedSlots.map(a => [a.key, a]))
      $slotsInfo = {...savedSlotsMap, ...$slotsInfo}
      console.log('slotsInfo', $slotsInfo)
      render();

    })

  }


</script>