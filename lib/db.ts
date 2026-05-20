import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL!, { max: 10 });

export default sql;
