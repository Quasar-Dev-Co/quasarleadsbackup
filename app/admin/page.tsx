"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  UserCheck,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface UnverifiedUser {
  _id: string;
  username: string;
  email: string;
  verified: boolean;
  admin: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const [unverifiedUsers, setUnverifiedUsers] = useState<UnverifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUser, setProcessingUser] = useState<string | null>(null);

  // Fetch unverified users
  const fetchUnverifiedUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/verify-user');
      
      if (response.ok) {
        const data = await response.json();
        setUnverifiedUsers(data.users || []);
      } else {
        toast.error('Failed to fetch unverified users');
      }
    } catch (error) {
      console.error('Error fetching unverified users:', error);
      toast.error('Failed to fetch unverified users');
    } finally {
      setLoading(false);
    }
  };

  // Handle user verification
  const handleUserAction = async (userId: string, action: 'verify' | 'reject') => {
    try {
      setProcessingUser(userId);
      
      const response = await fetch('/api/admin/verify-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        // Refresh the list
        await fetchUnverifiedUsers();
      } else {
        toast.error(data.error || `Failed to ${action} user`);
      }
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      toast.error(`Failed to ${action} user`);
    } finally {
      setProcessingUser(null);
    }
  };

  // Load unverified users on component mount
  useEffect(() => {
    fetchUnverifiedUsers();
  }, []);

  return (
    <div className="animate-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage user accounts and system settings</p>
      </div>

      <div className="grid gap-6">
        {/* User Verification Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-blue-600" />
                <CardTitle>User Verification</CardTitle>
                <Badge variant="secondary" className="ml-2">
                  {unverifiedUsers.length} pending
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUnverifiedUsers}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Loading users...</span>
              </div>
            ) : unverifiedUsers.length === 0 ? (
              <div className="text-center py-8">
                <UserCheck className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending verifications</h3>
                <p className="text-gray-500">All users have been verified or there are no new signups.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {unverifiedUsers.map((user) => (
                  <div key={user._id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">{user.username}</h3>
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Joined: {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUserAction(user._id, 'verify')}
                          disabled={processingUser === user._id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processingUser === user._id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-1" />
                          )}
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUserAction(user._id, 'reject')}
                          disabled={processingUser === user._id}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          {processingUser === user._id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-1" />
                          )}
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">User Management</h4>
                <p className="text-sm text-gray-600">
                  Manage user accounts, verify new signups, and control access to the system.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Security</h4>
                <p className="text-sm text-gray-600">
                  All new users require admin verification before they can access the system.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 