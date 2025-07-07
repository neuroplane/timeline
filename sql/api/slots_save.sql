create or replace function timeline.slots_save(params json, _token uuid) returns json
    language plpgsql
as
$$
DECLARE
    _i int = 0;
    _slot json;
    _slots json;
    _key text;
    _zone int;
    _date date;
    _time time;
BEGIN
    perform timeline.get_user(_token);
    _zone = requireInt(params,'zone');
    _slots = requireJson(params,'slots');

    FOR _slot IN SELECT * FROM json_array_elements(_slots) LOOP
        _key = requireText(_slot,'key');
        _date = TO_DATE(SPLIT_PART(_key, ' ', 1), 'YYYY-MM-DD');
        _time = TO_TIMESTAMP(SPLIT_PART(_key, ' ', 2), 'HH24:MI')::TIME;

        IF concat(_date::text,' ',TO_CHAR(_time, 'HH24:MI')) != _slot->>'key' THEN
            RAISE EXCEPTION 'Ошибка в конистентности данных. Перезагрузите страницу';
        END IF;

        insert into timeline.values(zone, date, time, value) values (_zone, _date, _time, _slot)  on conflict (zone,date,time) do update set value=_slot;
        _i = _i+1;
    END LOOP ;

    RETURN json_build_object('count',_i);
END
$$;

alter function timeline.slots_save(json, uuid) owner to neuroplane;



-- select timeline.slots_save('{"zone":1, "slots":[{"key":"2024-05-20 09:45","length":2,"i":{"h":9,"m":45},"type":1,"rest":["2024-05-20 10:00"],"label":"45 - 00","tags":[1]},{"key":"2024-05-20 10:00","length":1,"i":{"h":10,"m":0},"type":1,"h":true,"2024-05-20 10:00":[1],"tags":[1]},{"key":"2024-05-21 09:45","length":2,"i":{"h":9,"m":45},"type":1,"rest":["2024-05-21 10:00"],"label":"45 - 45","tags":[1]},{"key":"2024-05-21 10:00","length":1,"i":{"h":10,"m":0},"type":1,"h":true,"2024-05-21 10:00":[1],"tags":[1]}]}',timeline.test_token(1))

