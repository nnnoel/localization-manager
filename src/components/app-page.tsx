"use client";

import { useState } from "react";
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

type LocaleData = {
  [key: string]: { [lang: string]: string };
};

export function AppPage() {
  const [selectedDir, setSelectedDir] = useState<string | null>(null);
  const [localeData, setLocaleData] = useState<LocaleData>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<{ [lang: string]: string }>(
    {},
  );
  const [newKey, setNewKey] = useState("");
  const [newValues, setNewValues] = useState<{ [lang: string]: string }>({});
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "edit" | "delete" | "create" | null
  >(null);

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
    setEditedValues(localeData[key]);
  };

  const handleDelete = (key: string) => {
    setEditingKey(key);
    setConfirmAction("delete");
    setIsConfirmDialogOpen(true);
  };

  const handleCreate = () => {
    setConfirmAction("create");
    setIsConfirmDialogOpen(true);
  };

  const confirmChanges = async () => {
    if (confirmAction === "edit" && editingKey) {
      const updatedData = { ...localeData, [editingKey]: editedValues };
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
    }
    setEditingKey(null);
    setEditedValues({});
    setIsConfirmDialogOpen(false);
    setConfirmAction(null);
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
              placeholder="New key"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="mr-2"
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
              />
            ))}
            <Button onClick={handleCreate} className="mt-2">
              Create New Key
            </Button>
          </div>
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
              {Object.entries(localeData).map(([key, translations]) => (
                <TableRow key={key}>
                  <TableCell>{key}</TableCell>
                  {Object.entries(translations).map(([lang, value]) => (
                    <TableCell key={lang}>
                      {editingKey === key ? (
                        <Input
                          value={editedValues[lang] || ""}
                          onChange={(e) =>
                            setEditedValues({
                              ...editedValues,
                              [lang]: e.target.value,
                            })
                          }
                        />
                      ) : (
                        value
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    {editingKey === key ? (
                      <Button
                        onClick={() => {
                          setConfirmAction("edit");
                          setIsConfirmDialogOpen(true);
                        }}
                      >
                        Save
                      </Button>
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
              Are you sure you want to {confirmAction} this key?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setIsConfirmDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={confirmChanges}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

