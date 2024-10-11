"use client";

import { useState, useEffect } from "react";
import { open } from "@tauri-apps/api/dialog";
import { readDir, readTextFile, writeTextFile } from "@tauri-apps/api/fs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/useToast";
import { Toaster } from "@/components/ui/toaster";

type LocaleData = {
  [key: string]: { [lang: string]: string };
};

type EditedData = {
  [key: string]: {
    newKey: string;
    values: { [lang: string]: string };
  };
};

export function AppPage() {
  const [selectedDir, setSelectedDir] = useState<string | null>(null);
  const [localeData, setLocaleData] = useState<LocaleData>({});
  const [editedData, setEditedData] = useState<EditedData>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newValues, setNewValues] = useState<{ [lang: string]: string }>({});
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "edit" | "delete" | "create" | "bulk" | "cancelAll" | null
  >(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const selectDirectory = async () => {
    const selected = await open({ directory: true });
    if (selected && typeof selected === "string") {
      setSelectedDir(selected);
      await loadLocaleFiles(selected);
    }
  };

  const loadLocaleFiles = async (dir: string) => {
    const files = await readDir(dir);
    const jsonFiles = files.filter((file) => file.name?.endsWith(".json"));

    const data: LocaleData = {};
    for (const file of jsonFiles) {
      if (file.name) {
        const lang = file.name.replace(".json", "");
        const content = await readTextFile(`${dir}/${file.name}`);
        const json = JSON.parse(content);

        Object.keys(json).forEach((key) => {
          if (!data[key]) data[key] = {};
          data[key][lang] = json[key];
        });
      }
    }
    setLocaleData(data);
  };

  const handleEdit = (key: string) => {
    setEditingKey(key);
    if (!editedData[key]) {
      setEditedData((prev) => ({
        ...prev,
        [key]: { newKey: key, values: { ...localeData[key] } },
      }));
    }
    setHasUnsavedChanges(true);
  };

  const handleEditChange = (key: string, field: string, value: string) => {
    setEditedData((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field === "key" ? "newKey" : "values"]:
          field === "key" ? value : { ...prev[key].values, [field]: value },
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleDelete = (key: string) => {
    setEditingKey(key);
    setConfirmAction("delete");
    setIsConfirmDialogOpen(true);
  };

  const handleCreate = () => {
    if (
      localeData[newKey] ||
      Object.values(editedData).some((edit) => edit.newKey === newKey)
    ) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Key already exists",
      });
      return;
    }
    setConfirmAction("create");
    setIsConfirmDialogOpen(true);
  };

  const confirmChanges = async () => {
    if (confirmAction === "edit") {
      const updatedData = { ...localeData };
      Object.entries(editedData).forEach(([oldKey, { newKey, values }]) => {
        delete updatedData[oldKey];
        updatedData[newKey] = values;
      });
      setLocaleData(updatedData);
      await saveChanges(updatedData);
    } else if (confirmAction === "delete" && editingKey) {
      const updatedData = { ...localeData };
      delete updatedData[editingKey];
      setLocaleData(updatedData);
      await saveChanges(updatedData);
    } else if (confirmAction === "create") {
      const updatedData = { ...localeData, [newKey]: newValues };
      setLocaleData(updatedData);
      await saveChanges(updatedData);
      setNewKey("");
      setNewValues({});
    } else if (confirmAction === "bulk") {
      const updatedData = { ...localeData };
      Object.entries(editedData).forEach(([oldKey, { newKey, values }]) => {
        delete updatedData[oldKey];
        updatedData[newKey] = values;
      });
      setLocaleData(updatedData);
      await saveChanges(updatedData);
    } else if (confirmAction === "cancelAll") {
      setEditedData({});
    }
    setEditingKey(null);
    setEditedData({});
    setIsConfirmDialogOpen(false);
    setConfirmAction(null);
    setHasUnsavedChanges(false);
    toast({
      title: "Success",
      description:
        confirmAction === "cancelAll"
          ? "All changes cancelled"
          : "Changes saved successfully",
    });
  };

  const saveChanges = async (data: LocaleData) => {
    if (!selectedDir) return;

    const languages = Object.keys(Object.values(data)[0] || {});
    for (const lang of languages) {
      const langData: { [key: string]: string } = {};
      Object.keys(data).forEach((key) => {
        langData[key] = data[key][lang];
      });
      await writeTextFile(
        `${selectedDir}/${lang}.json`,
        JSON.stringify(langData, null, 2),
      );
    }
  };

  const handleBulkSave = () => {
    setConfirmAction("bulk");
    setIsConfirmDialogOpen(true);
  };

  const handleCancelEdit = (key: string) => {
    setEditedData((prev) => {
      const newEditedData = { ...prev };
      delete newEditedData[key];
      return newEditedData;
    });
    setEditingKey(null);
    if (Object.keys(editedData).length === 1) {
      setHasUnsavedChanges(false);
    }
  };

  const handleCancelAllChanges = () => {
    setConfirmAction("cancelAll");
    setIsConfirmDialogOpen(true);
  };

  const filterLocaleData = () => {
    if (!searchQuery) return localeData;
    const lowercaseQuery = searchQuery.toLowerCase();
    return Object.entries(localeData).reduce(
      (filtered, [key, translations]) => {
        const matchesKey = key.toLowerCase().includes(lowercaseQuery);
        const matchesValue = Object.values(translations).some((value) =>
          value.toLowerCase().includes(lowercaseQuery),
        );
        if (matchesKey || matchesValue) {
          filtered[key] = translations;
        }
        return filtered;
      },
      {} as LocaleData,
    );
  };

  const filteredLocaleData = filterLocaleData();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Localization Manager</h1>
      {!selectedDir ? (
        <Button onClick={selectDirectory}>Select Directory</Button>
      ) : (
        <>
          <p className="mb-4">Selected directory: {selectedDir}</p>
          <div className="mb-4">
            <Input
              placeholder="Search keys and translations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />
            <Input
              placeholder="New key"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="mr-2"
              autoCapitalize="off"
              autoComplete="off"
            />
            {Object.keys(Object.values(localeData)[0] || {}).map((lang) => (
              <Input
                key={lang}
                placeholder={`${lang} value`}
                value={newValues[lang] || ""}
                onChange={(e) =>
                  setNewValues({ ...newValues, [lang]: e.target.value })
                }
                className="mr-2 mt-2"
                autoCapitalize="off"
                autoComplete="off"
              />
            ))}
            <Button onClick={handleCreate} className="mt-2">
              Create New Key
            </Button>
          </div>
          {hasUnsavedChanges && (
            <div className="mb-4">
              <Button onClick={handleBulkSave} className="mr-2">
                Confirm All Changes
              </Button>
              <Button onClick={handleCancelAllChanges} variant="outline">
                Cancel All Changes
              </Button>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                {Object.keys(Object.values(localeData)[0] || {}).map((lang) => (
                  <TableHead key={lang}>{lang}</TableHead>
                ))}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(filteredLocaleData).map(([key, translations]) => (
                <TableRow key={key}>
                  <TableCell>
                    {editingKey === key ? (
                      <Input
                        value={editedData[key]?.newKey || key}
                        onChange={(e) =>
                          handleEditChange(key, "key", e.target.value)
                        }
                      />
                    ) : (
                      editedData[key]?.newKey || key
                    )}
                  </TableCell>
                  {Object.entries(translations).map(([lang, value]) => (
                    <TableCell key={lang}>
                      {editingKey === key ? (
                        <Input
                          value={editedData[key]?.values[lang] || value}
                          onChange={(e) =>
                            handleEditChange(key, lang, e.target.value)
                          }
                          autoCapitalize="off"
                          autoComplete="off"
                        />
                      ) : (
                        editedData[key]?.values[lang] || value
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    {editingKey === key ? (
                      <>
                        <Button
                          onClick={() => {
                            setConfirmAction("edit");
                            setIsConfirmDialogOpen(true);
                          }}
                          className="mr-2"
                        >
                          Save
                        </Button>
                        <Button
                          onClick={() => handleCancelEdit(key)}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleEdit(key)}
                          className="mr-2"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDelete(key)}
                          variant="destructive"
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              Are you sure you want to {confirmAction}{" "}
              {confirmAction === "bulk"
                ? "all changes"
                : confirmAction === "cancelAll"
                  ? "cancel all changes"
                  : "this key"}
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setIsConfirmDialogOpen(false)}
              variant="outline"
            >
              No
            </Button>
            <Button onClick={confirmChanges}>Yes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Toaster />
    </div>
  );
}
