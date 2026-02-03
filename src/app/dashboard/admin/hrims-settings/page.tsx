'use client';

import { PageHeader } from '@/components/shared/page-header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import React, { useState, useEffect } from 'react';
import {
  Loader2,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Save,
  Eye,
  EyeOff,
  Server,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface HrimsConfig {
  host: string;
  port: string;
  apiKey: string;
  token: string;
  baseUrl: string;
  _fullApiKey?: string;
  _fullToken?: string;
}

interface ConnectionTestResult {
  success: boolean;
  message: string;
  responseTime?: number;
}

export default function HrimsSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(
    null
  );

  const [config, setConfig] = useState<HrimsConfig>({
    host: '',
    port: '',
    apiKey: '',
    token: '',
    baseUrl: '',
  });

  // Fetch current configuration on mount
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/hrims-settings');
      const result = await response.json();

      if (result.success && result.data) {
        setConfig({
          host: result.data.host,
          port: result.data.port,
          apiKey: result.data._fullApiKey || '',
          token: result.data._fullToken || '',
          baseUrl: result.data.baseUrl,
        });
      }
    } catch (error) {
      console.error('Error fetching HRIMS config:', error);
      toast({
        title: 'Error',
        description: 'Failed to load HRIMS configuration',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/admin/hrims-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: config.host,
          port: config.port,
          apiKey: config.apiKey,
          token: config.token,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Settings Saved',
          description: 'HRIMS configuration has been updated successfully',
        });
        // Update the baseUrl display
        setConfig((prev) => ({
          ...prev,
          baseUrl: result.data.baseUrl,
        }));
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to save settings',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving HRIMS config:', error);
      toast({
        title: 'Error',
        description: 'Failed to save HRIMS configuration',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/admin/hrims-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: config.host,
          port: config.port,
          apiKey: config.apiKey,
          token: config.token,
        }),
      });

      const result = await response.json();

      setTestResult({
        success: result.success,
        message: result.message,
        responseTime: result.data?.responseTime,
      });

      toast({
        title: result.success ? 'Connection Successful' : 'Connection Failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (error) {
      console.error('Error testing HRIMS connection:', error);
      setTestResult({
        success: false,
        message: 'Failed to test connection',
      });
      toast({
        title: 'Error',
        description: 'Failed to test HRIMS connection',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="HRIMS Integration Settings"
          description="Configure the connection to the HRIMS external API"
        />
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading configuration...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="HRIMS Integration Settings"
        description="Configure the connection to the HRIMS external API"
      />

      {/* Current Configuration Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Current Configuration
          </CardTitle>
          <CardDescription>
            The HRIMS API endpoint currently configured for this system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg px-4 py-2">
              {config.baseUrl || 'Not configured'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchConfig}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            HRIMS Server Configuration
          </CardTitle>
          <CardDescription>
            Enter the IP address/hostname and port of the HRIMS server. Changes
            will apply to all HRIMS integrations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Host and Port */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="host">
                  Host / IP Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="host"
                  type="text"
                  value={config.host}
                  onChange={(e) =>
                    setConfig({ ...config, host: e.target.value })
                  }
                  placeholder="10.0.217.11"
                />
                <p className="text-xs text-gray-500">
                  IP address (e.g., 10.0.217.11) or hostname (e.g.,
                  hrims.example.com)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="port">
                  Port <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="port"
                  type="text"
                  value={config.port}
                  onChange={(e) =>
                    setConfig({ ...config, port: e.target.value })
                  }
                  placeholder="8135"
                />
                <p className="text-xs text-gray-500">
                  Port number (1-65535), typically 8135 for HRIMS
                </p>
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={(e) =>
                    setConfig({ ...config, apiKey: e.target.value })
                  }
                  placeholder="Enter API key..."
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Leave empty to keep the current API key
              </p>
            </div>

            {/* Token */}
            <div className="space-y-2">
              <Label htmlFor="token">Authentication Token</Label>
              <div className="relative">
                <Input
                  id="token"
                  type={showToken ? 'text' : 'password'}
                  value={config.token}
                  onChange={(e) =>
                    setConfig({ ...config, token: e.target.value })
                  }
                  placeholder="Enter authentication token..."
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showToken ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Leave empty to keep the current token
              </p>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 border rounded-lg p-4">
              <Label className="text-sm font-medium">
                Resulting API Base URL:
              </Label>
              <p className="text-lg font-mono mt-1 text-blue-600">
                http://{config.host || '[host]'}:{config.port || '[port]'}/api
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving || !config.host || !config.port}
                className="flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? 'Saving...' : 'Save Configuration'}
              </Button>

              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={
                  isTesting ||
                  !config.host ||
                  !config.port ||
                  !config.apiKey ||
                  !config.token
                }
                className="flex items-center gap-2"
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isTesting ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Result */}
      {testResult && (
        <Card
          className={`mb-6 ${testResult.success ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Connection Test Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-lg ${testResult.success ? 'text-green-800' : 'text-red-800'}`}
            >
              {testResult.message}
            </p>
            {testResult.responseTime && (
              <p className="text-sm text-gray-600 mt-2">
                Response time: {testResult.responseTime}ms
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Important Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-3">
            <p>
              <strong>When to change these settings:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                When the HRIMS server IP address changes (e.g., server
                migration)
              </li>
              <li>
                When setting up a test/staging environment with different HRIMS
                server
              </li>
              <li>When HRIMS API credentials are rotated</li>
            </ul>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800">
                <strong>Warning:</strong> Changing these settings will affect
                all HRIMS-related operations including:
              </p>
              <ul className="list-disc list-inside mt-2 text-amber-700">
                <li>Employee data fetching</li>
                <li>Photo retrieval</li>
                <li>Document fetching</li>
                <li>Bulk institution data sync</li>
              </ul>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">
                <strong>Tip:</strong> Always test the connection before saving
                new settings to ensure the HRIMS server is accessible with the
                provided credentials.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
