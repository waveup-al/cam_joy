/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppProvider } from "./AppContext";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { RuleEngine } from "./components/RuleEngine";
import { FileProcessor } from "./components/FileProcessor";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <AppProvider>
      <div className="flex h-screen bg-white overflow-hidden font-sans">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 overflow-auto">
          {activeTab === "dashboard" && <Dashboard />}
          {activeTab === "rules" && <RuleEngine />}
          {activeTab === "processor" && <FileProcessor />}
          {activeTab === "history" && (
            <div className="p-8 flex items-center justify-center h-full text-slate-400">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-700 mb-2">
                  History Log
                </h2>
                <p>Coming soon in v2.0</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </AppProvider>
  );
}
