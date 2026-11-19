export const updateNotebookTaskChecked = (html: string, taskIndex: number, checked: boolean) => {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const taskItems = parsed.querySelectorAll('li[data-type="taskItem"]');
  const taskItem = taskItems.item(taskIndex);
  if (!taskItem) return html;
  taskItem.setAttribute("data-checked", String(checked));
  const checkbox = taskItem.querySelector('input[type="checkbox"]');
  if (checkbox instanceof HTMLInputElement) {
    if (checked) checkbox.setAttribute("checked", "checked");
    else checkbox.removeAttribute("checked");
  }
  return parsed.body.innerHTML;
};
