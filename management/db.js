export const quote = (value) => `"${value.replaceAll('"', '""')}"`;
export function rowPredicate(keys, key) {
  if (
    !key ||
    Array.isArray(key) ||
    typeof key !== 'object' ||
    !keys.length ||
    Object.keys(key).length !== keys.length ||
    keys.some((k) => !(k in key) || !['string', 'number', 'boolean'].includes(typeof key[k]))
  )
    throw Object.assign(new Error('A complete primary key is required.'), { status: 400 });
  return {
    text: keys.map((k, i) => `${quote(k)} = $${i + 1}`).join(' AND '),
    values: keys.map((k) => key[k]),
  };
}
export async function describe(sql, name) {
  const columns =
    await sql`select column_name as name, data_type as type, is_nullable = 'YES' as nullable from information_schema.columns where table_schema='public' and table_name=${name} order by ordinal_position`;
  const [table] =
    await sql`select tablename from pg_tables where schemaname='public' and tablename=${name}`;
  if (!table) throw Object.assign(new Error('Table not found.'), { status: 404 });
  const keys =
    await sql`select a.attname as name from pg_index i join pg_class c on c.oid=i.indrelid join pg_namespace n on n.oid=c.relnamespace cross join lateral unnest(i.indkey) with ordinality k(attnum,ord) join pg_attribute a on a.attrelid=c.oid and a.attnum=k.attnum where n.nspname='public' and c.relname=${name} and i.indisprimary order by k.ord`;
  return { columns, primaryKey: keys.map((k) => k.name) };
}
export async function remove(sql, name, key, all) {
  return sql.begin(async (tx) => {
    // Lock before checking references so concurrent writes cannot introduce dependents.
    const tables =
      await tx`select tablename from pg_tables where schemaname='public' order by tablename`;
    if (!tables.some((t) => t.tablename === name))
      throw Object.assign(new Error('Table not found.'), { status: 404 });
    await tx.unsafe(
      `LOCK TABLE ${tables.map((t) => `public.${quote(t.tablename)}`).join(',')} IN SHARE ROW EXCLUSIVE MODE`,
    );
    const { primaryKey } = await describe(tx, name);
    const predicate = all ? { text: 'TRUE', values: [] } : rowPredicate(primaryKey, key);
    const refs =
      await tx`select c.conrelid::regclass::text as child, array_agg(a.attname order by k.ord) as child_columns, array_agg(b.attname order by k.ord) as parent_columns from pg_constraint c cross join lateral unnest(c.conkey,c.confkey) with ordinality k(childnum,parentnum,ord) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.childnum join pg_attribute b on b.attrelid=c.confrelid and b.attnum=k.parentnum where c.contype='f' and c.confrelid=to_regclass(${`public.${quote(name)}`}) group by c.oid,c.conrelid`;
    for (const ref of refs) {
      const joins = ref.child_columns
        .map((col, i) => `child.${quote(col)}=parent.${quote(ref.parent_columns[i])}`)
        .join(' AND ');
      const [result] = await tx.unsafe(
        `SELECT EXISTS(SELECT 1 FROM ${ref.child} child JOIN (SELECT * FROM public.${quote(name)} WHERE ${predicate.text}) parent ON ${joins}) AS found`,
        predicate.values,
      );
      if (result.found)
        throw Object.assign(
          new Error(
            `Related rows exist in ${ref.child}. Delete those rows first; no rows were deleted.`,
          ),
          { status: 409 },
        );
    }
    const result = await tx.unsafe(
      `DELETE FROM public.${quote(name)} WHERE ${predicate.text}`,
      predicate.values,
    );
    return { deleted: result.count };
  });
}
