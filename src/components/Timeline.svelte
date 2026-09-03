    <div>

        {#await loading}
            <p>...loading</p>
        {:then _}


        <div class="fixed top-0 left-0 right-0 z-10  flex items-center " style="width:120px">
            <div class="flex flex-row flex-grow justify-between items-center m-4">
                <Button disabled={!hasUpdated} size="xs" on:click={handleSavClick}>Сохранить</Button>
            </div>
        </div>

        <div class="flex flex-row items-center justify-center gap-2 mb-4 mt-0">

            <Button outline on:click={()=>handleWeekMove(-1)}>←</Button>

            {#each $types as type}
                <button disabled={Object.keys($selectedKeys).length===0} type="button" class="text-center font-medium inline-flex focus:outline-none items-center justify-center border-transparent focus:border-transparent focus:ring-0 px-5 py-2.5 text-sm text-white rounded-lg border-2" style="background-color: {type.color}; {type.label == $selectedType?.label ? 'box-shadow:2px 2px  5px black;' : ''};" on:click={()=>handleBadgeClick(type)}>{type.label}</button>

            {/each}
            <Button outline on:click={()=>handleWeekMove(+1)}>→</Button>
        </div>

        <svg role="gridcell" tabindex="0" bind:this={svg} style="width:1400px; height:500px" viewBox="0 0 1400 500" fill="none" xmlns="http://www.w3.org/2000/svg" on:mouseup={handleAriaMouseUp} on:mousedown={handleAriaMouseDown} on:mousemove={handleAriaMouseMove}>
            <pattern id="diagonalHatch" patternUnits="userSpaceOnUse" width="4" height="4">
                <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" style="stroke:rgba(255,0,0,0.5); stroke-width:1"></path>
            </pattern>
            {#each timeslots as ts, ts_idx}
                <g transform={`translate(${leftShift},${0})`}>
                    <g transform={`translate(${ts_idx*slotWidth*4+(slotGroupSpace*ts_idx)},${0})`}>
                        <rect x={0} y={0} width={slotWidth*4} height={slotWidth} stroke="#000" fill={ts[0] % 2 === 0 ? evenFill : oddFill}/>
                        <text x={slotWidth*2} y={11} font-size={13} text-anchor="middle" fill="#000">{ts[0]}</text>
                    </g>
                </g>
            {/each}
            <g transform={`translate(0,20)`} >
                {#each days as day, day_idx (day.str)}
                    <g transform={`translate(0,${day_idx*slotWidth})`}>
                        <text x={leftShift-10} y={fontSize+2} font-size={fontSize} text-anchor="end" fill="#000">{day.shortDate}</text>
                        {#each timeslots as ts, ts_idx}
                            <g transform={`translate(${leftShift},${0})`}>
                                <g transform={`translate(${ts_idx*slotWidth*4+(slotGroupSpace*ts_idx)},${0})`}>
                                    <rect x={0} y={0} width={slotWidth*4} height={slotWidth} stroke="#000" fill={ts[0] % 2 === 0 ? evenFill : oddFill}/>
                                    {#each ts[1] as minute, idx}
                                        <Rect key={day.str + '_' + ts[0] + '_' + minute} x={idx*slotWidth} y={0} fontSize={fontSize} width={slotWidth} height={slotWidth} text={minute}/>
                                    {/each}
                                </g>
                            </g>
                        {/each}
                    </g>
                {/each}
            </g>
            <rect id="selection" x={selection.x} y={selection.y} width={selection.width} height={selection.height} fill="none" stroke="red" stroke-width="2" stroke-dasharray="5 2"/>
        </svg>

        {:catch error}
            <p style="color: red">{error.message}</p>
        {/await}
    </div>


<script>
  import Rect from "./Rect.svelte";
  import {selectedType, main, selectedKeys, types, currentUser} from "../lib/MainStore";
  import {Button} from "flowbite-svelte";
  import {apiService} from "../lib/api.js";

  function getInitialData(minDate,maxDate){
    const typesHash = {}
    for (let t of $types) {
      typesHash[t.id] = t
    }
    return apiService.getValues({minDate, maxDate}).then(a=>{
      a.forEach(v=>{
        const key = v[0] + '_' + v[1] + '_' + v[2]
        if (!main[key]) {
          $main[key] = typesHash[v[3]]
        }
      })
    })
  }



  let days = []
  const today = new Date()
  let startDate = new Date(today.getFullYear(), today.getMonth(), 1)

  function getDateString(d){
    const year = d.getFullYear(); // Get the year (e.g., 2023)
    const month = (d.getMonth() + 1).toString().padStart(2, '0'); // Get the month (0-11) and add 1, then pad with leading zero if needed
    const day = d.getDate().toString().padStart(2, '0'); // Get the day of the month and pad with leading zero if needed

    return `${year}-${month}-${day}`
  }

  function handleWeekMove(delta) {
    startDate = new Date(startDate.getTime() + (7 * delta * 24 * 60 * 60 * 1000));
    let dateStr;
    const loc_days = []
    for (let i = 0; i < 24; i++) {
      const d = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
      dateStr = getDateString(d)

      loc_days.push({
        date: d,
        shortDate: d.toLocaleDateString('ru-RU', {weekday: 'short', day: 'numeric', month: 'long'}),
        str: dateStr
      })
    }
    days = loc_days

    return getInitialData(getDateString(startDate), dateStr)
  }

  let svg;
  let keysWhereUpdated = new Set()

  let hasUpdated = false

  const loading = apiService.getTypes().then(tps=>{
    $types = tps
    return handleWeekMove(0)
  })

  function handleAriaMouseDown(e) {

    selection.x = e.offsetX
    selection.y = e.offsetY
    selection.width = 0
    selection.height = 0

  }

  function handleAriaMouseMove(e) {
    if (e.buttons === 1) {

      let width = e.offsetX - selection.x
      let height = e.offsetY - selection.y
      if(width < 0) width = 4
      if(height < 0) height = 4

      selection.width = width
      selection.height = height
    }

  }

  let lastY = 20

  function handleTestClick(){
    lastY+=10
    console.log(lastY)
    selection.x = 84
    selection.y = lastY
    selection.width = 30
    selection.height = 30
    handleAriaMouseUp()
  }

  function handleAriaMouseUp(e) {

    const r = svg.createSVGRect();
    r.x = selection.x;
    r.y = selection.y;
    r.width = selection.width;
    r.height = selection.height;

    const isSafari = /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof safari !== 'undefined' && window['safari'].pushNotification));

    if (isSafari) {
      r.y += 60
    }


    const nodeList = svg.getIntersectionList(r, null);
    const arr = Array.from(nodeList);

    $selectedKeys = arr.reduce((acc, node) => {
      if (node.id && node.id!=='selection') {
        acc[node.id] = true;
      }
      return acc;
    }, {});

    selection.x = 0
    selection.y = 0
    selection.width = 0
    selection.height = 0
  }


  const selection = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  }




  const leftShift = 80
  const slotWidth = 20
  const slotGroupSpace = 1
  const fontSize = 10
  const oddFill = '#ebe6e0'
  const evenFill = '#fcf7f1'

  const timeslots = []

  for (let i = 8; i < 24; i++) {
    const minutes = [0, 15, 30, 45]
    timeslots.push([i, minutes])

  }

  function handleBadgeClick(type) {
    Object.keys($selectedKeys).forEach((key) => {
      $main[key] = type
      keysWhereUpdated.add(key)
      hasUpdated = true
    })
    $selectedKeys = {}

  }

  function handleSavClick() {

    if(!keysWhereUpdated.size){
      return
    }

    const data = []

    for (let key of keysWhereUpdated) {
      const d = key.split('_')
      data.push([d[0], +d[1], +d[2], $main[key].id])
    }

    apiService.setValues(data).then((a)=>{
      keysWhereUpdated.clear()
      hasUpdated = false
    }).catch(alert)
  }


</script>


<style>
    svg {
        dominant-baseline: middle;
        user-select: none;

    }
    * { outline: none !important; }
    button[disabled=disabled], button:disabled {
        opacity: 0.5;
    }

</style>
