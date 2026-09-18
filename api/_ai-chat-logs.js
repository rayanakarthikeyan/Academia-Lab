import {
  requireUser,
  createSupabaseClient,
  getQuery,
  sendError,
  isTester,
} from "./_shared.js";
import { tutorError } from "./_tutor-context.js";
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  try {
    if (req.method !== "GET")
      return res.status(405).json({ error: "Method not allowed" });
    const db = createSupabaseClient({ requirePrivileged: true });
    await requireUser(db, req, ["faculty", "admin"]);
    const query = getQuery(req);
    if (query.summary === "1") {
      const ids = [
        ...new Set(
          String(query.userIds || "")
            .split(",")
            .filter(Boolean),
        ),
      ];
      if (!ids.length || ids.length > 50)
        throw tutorError("Request up to 50 students at a time.");
      const summaries = [];
      for (let i = 0; i < ids.length; i += 5) {
        summaries.push(
          ...(await Promise.all(
            ids.slice(i, i + 5).map(async (id) => {
              const { data: people, error: personError } = await db
                .from("users")
                .select("id,role,title")
                .eq("id", id)
                .limit(1);
              if (personError) throw personError;
              if (people?.[0]?.role !== "student" || isTester(people[0]))
                return null;
              const count = async (status) => {
                let request = db
                  .from("learning_records")
                  .select("id", { count: "exact", head: true })
                  .eq("kind", "ai_chat")
                  .eq("author_id", id)
                  .ilike("id", "tutor:%");
                if (status) request = request.eq("status", status);
                const { count, error } = await request;
                if (error) throw error;
                return count || 0;
              };
              const [requests, answered, failed] = await Promise.all([
                count(),
                count("answered"),
                count("failed"),
              ]);
              return { userId: id, requests, answered, failed };
            }),
          )),
        );
      }
      return res.status(200).json({ summaries: summaries.filter(Boolean) });
    }
    const id = String(query.userId || "");
    if (!id) throw tutorError("Select a student.");
    const offset = Math.max(
      0,
      Math.min(1000000, Number.parseInt(query.offset, 10) || 0),
    );
    const { data, error } = await db
      .from("learning_records")
      .select("*")
      .eq("author_id", id)
      .eq("kind", "ai_chat")
      .order("id", { ascending: false })
      .range(offset, offset + 20);
    if (error) throw error;
    const records = (data || []).slice(0, 20);
    return res
      .status(200)
      .json({
        records,
        hasMore: (data || []).length > 20,
        logs: records.flatMap((r) =>
          r.metadata?.role === "exchange"
            ? [
                {
                  id: r.id,
                  user_id: id,
                  challenge_id: r.metadata?.title,
                  role: "user",
                  content: r.body,
                },
                ...(r.metadata.answer
                  ? [
                      {
                        id: r.id + "-reply",
                        user_id: id,
                        challenge_id: r.metadata.title,
                        role: "model",
                        content: r.metadata.answer,
                      },
                    ]
                  : []),
              ]
            : [
                {
                  id: r.id,
                  user_id: id,
                  challenge_id: r.assignment_id,
                  role: r.metadata?.role,
                  content: r.body,
                },
              ],
        ),
      });
  } catch (error) {
    return sendError(res, error);
  }
}
