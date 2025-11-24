'use client';

import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import type { Employee } from '@/lib/types';

interface EmployeeSearchProps {
  onEmployeeFound: (employee: Employee) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function EmployeeSearch({ 
  onEmployeeFound, 
  onClear, 
  placeholder = "Enter ZANID or Payroll Number",
  disabled = false 
}: EmployeeSearchProps) {
  const { role, user } = useAuth();
  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter a ZANID or Payroll Number",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const cleanSearchValue = searchValue.trim();
      console.log(`Searching for employee with identifier: ${cleanSearchValue}`);
      
      const userParams = `&userRole=${role}&userInstitutionId=${user?.institutionId || ''}`;
      const response = await fetch(`/api/employees/search?identifier=${cleanSearchValue}${userParams}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Search failed with status ${response.status}:`, errorText);
        throw new Error(`Search failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Search result:', result);

      if (!result.success) {
        throw new Error(result.message || 'Search failed');
      }

      if (!result.data || result.data.length === 0) {
        toast({
          title: "Employee Not Found",
          description: "No employee found with the provided ZANID or Payroll Number",
          variant: "destructive",
        });
        return;
      }

      if (result.data.length > 1) {
        toast({
          title: "Multiple Employees Found",
          description: "Multiple employees found. Please use a more specific identifier.",
          variant: "destructive",
        });
        return;
      }

      const employee = result.data[0];
      console.log('Found employee:', employee);
      
      onEmployeeFound(employee);
      
      toast({
        title: "Employee Found",
        description: `Found: ${employee.name}`,
      });

    } catch (error) {
      console.error('Error searching for employee:', error);
      toast({
        title: "Search Error",
        description: error instanceof Error ? error.message : "Failed to search for employee",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setSearchValue('');
    onClear?.();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="employee-search">Employee Search</Label>
        <div className="flex gap-2">
          <Input
            id="employee-search"
            type="text"
            placeholder={placeholder}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={disabled || isSearching}
            className="flex-1"
          />
          <Button 
            onClick={handleSearch} 
            disabled={disabled || isSearching || !searchValue.trim()}
            size="default"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
          {searchValue && (
            <Button 
              variant="outline" 
              onClick={handleClear}
              disabled={disabled || isSearching}
              size="default"
            >
              Clear
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Enter either a ZANID or Payroll Number to search for an employee
        </p>
      </div>
    </div>
  );
}