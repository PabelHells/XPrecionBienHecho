import { useEffect, useState, type DependencyList } from "react";
import { errorMessage } from "./utils";
export function useData<T>(
  query: () => PromiseLike<{ data: T | null; error: unknown }>,
  deps: DependencyList = [],
) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setData(null);
    Promise.resolve()
      .then(query)
      .then(({ data, error }) => {
        if (active) {
          setData(data);
          if (error) setError(errorMessage(error));
        }
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // The caller explicitly defines the query inputs; revision provides manual refresh.
  }, [...deps, revision]);
  return { data, error, loading, reload: () => setRevision((r) => r + 1) };
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  async function run(
    action: () => Promise<void>,
    message = "Cambios guardados.",
  ) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await action();
      setSuccess(message);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, success, run };
}
