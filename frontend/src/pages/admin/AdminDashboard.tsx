import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  AlertTriangle,
  Download,
  Eye,
  Clock,
  Plus,
  HardDrive,
  Image,
  Archive,
  Heart
} from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useLocalizedDate } from '../../hooks/useLocalizedDate';

import { Button, Card, Loading } from '../../components/common';
import { useQuery } from '@tanstack/react-query';
import { eventsService } from '../../services/events.service';
import { adminService } from '../../services/admin.service';

interface StatCard {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { format, formatDistanceToNow } = useLocalizedDate();

  // Fetch dashboard statistics
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => adminService.getDashboardStats(),
  });

  // Fetch recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: () => adminService.getRecentActivity(10),
  });

  // Fetch system health
  const { data: systemHealth } = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: () => adminService.getSystemHealth(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch events data for expiring events
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['admin-events-summary'],
    queryFn: () => eventsService.getEvents(1, 100),
  });

  const isLoading = statsLoading || eventsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" text={t('admin.loadingDashboard')} />
      </div>
    );
  }

  // Calculate expiring events
  const activeEvents = eventsData?.events.filter(e => e.is_active && !e.is_archived) || [];
  const expiringEvents = activeEvents.filter(e => {
    const days = differenceInDays(parseISO(e.expires_at), new Date());
    return days <= 7 && days > 0;
  });

  // Format numbers for display
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Build statistics cards - always show 8 cards in 2x4 grid
  const stats: StatCard[] = [
    {
      title: t('admin.activeEvents'),
      value: dashboardStats?.activeEvents || 0,
      icon: Calendar,
      color: 'text-green-600',
    },
    {
      title: t('admin.expiringSoon'),
      value: dashboardStats?.expiringEvents || 0,
      change: t('admin.next7Days'),
      icon: AlertTriangle,
      color: 'text-orange-600',
    },
    {
      title: t('admin.totalPhotos'),
      value: formatNumber(dashboardStats?.totalPhotos || 0),
      icon: Image,
      color: 'text-blue-600',
    },
    {
      title: t('admin.storageUsed'),
      value: adminService.formatBytes(dashboardStats?.storageUsed || 0),
      icon: HardDrive,
      color: 'text-purple-600',
    },
    {
      title: t('admin.totalViews'),
      value: formatNumber(dashboardStats?.totalViews || 0),
      change: dashboardStats?.viewsTrend ? t('admin.percentFromLastWeek', { percent: `${dashboardStats.viewsTrend > 0 ? '+' : ''}${dashboardStats.viewsTrend}` }) : undefined,
      icon: Eye,
      color: 'text-indigo-600',
    },
    {
      title: t('admin.downloads'),
      value: formatNumber(dashboardStats?.totalDownloads || 0),
      change: dashboardStats?.downloadsTrend ? t('admin.percentFromLastWeek', { percent: `${dashboardStats.downloadsTrend > 0 ? '+' : ''}${dashboardStats.downloadsTrend}` }) : undefined,
      icon: Download,
      color: 'text-pink-600',
    },
    {
      title: t('admin.archivedEvents'),
      value: dashboardStats?.archivedEvents || 0,
      icon: Archive,
      color: 'text-gray-600',
    },
    {
      title: t('admin.systemHealth'),
      value: systemHealth ? t(`admin.health.${systemHealth.overall}`) : t('admin.health.checking'),
      icon: Heart,
      color: systemHealth?.overall === 'healthy' ? 'text-green-600' : systemHealth?.overall === 'warning' ? 'text-yellow-600' : 'text-red-600',
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('navigation.dashboard')}</h1>
          <p className="text-neutral-600 mt-1">{t('admin.dashboardSubtitle')}</p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-5 h-5" />}
          onClick={() => navigate('/admin/events/new')}
        >
          {t('events.createEvent')}
        </Button>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">{stat.title}</p>
                <p className="text-2xl font-bold text-neutral-900 mt-1">{stat.value}</p>
                {stat.change && (
                  <p className="text-sm text-neutral-500 mt-1">{stat.change}</p>
                )}
              </div>
              <div className={`p-3 rounded-full bg-neutral-100 ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expiring Events */}
        <div className="lg:col-span-2">
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900">{t('admin.eventsExpiringSoon')}</h2>
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            
            {expiringEvents.length === 0 ? (
              <p className="text-neutral-600 py-8 text-center">{t('admin.noEventsExpiring')}</p>
            ) : (
              <div className="space-y-3">
                {expiringEvents.slice(0, 5).map((event) => {
                  const daysLeft = differenceInDays(parseISO(event.expires_at), new Date());
                  
                  return (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors"
                      onClick={() => navigate(`/admin/events/${event.id}`)}
                    >
                      <div>
                        <h3 className="font-medium text-neutral-900">{event.event_name}</h3>
                        <p className="text-sm text-neutral-600">
                          {format(parseISO(event.event_date), 'PP')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-orange-600">
                          {t('admin.daysLeft', { count: daysLeft })}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {t('gallery.expires')} {format(parseISO(event.expires_at), 'PP')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {expiringEvents.length > 5 && (
              <button
                onClick={() => navigate('/admin/events?filter=expiring')}
                className="w-full mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {t('admin.viewAllExpiringEvents', { count: expiringEvents.length })} →
              </button>
            )}
          </Card>
        </div>

        {/* Recent Activity */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">{t('admin.recentActivity')}</h2>
            <Clock className="w-5 h-5 text-neutral-500" />
          </div>
          
          <div className="space-y-4">
            {!recentActivity || recentActivity.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-4">{t('admin.noRecentActivity')}</p>
            ) : (
              recentActivity.slice(0, 5).map((activity) => {
                // Get color based on activity type
                const getActivityColor = (type: string) => {
                  const colors: Record<string, string> = {
                    'event_created': 'bg-green-500',
                    'photos_uploaded': 'bg-blue-500',
                    'event_archived': 'bg-purple-500',
                    'archive_restored': 'bg-indigo-500',
                    'archive_deleted': 'bg-red-500',
                    'bulk_download': 'bg-blue-500',
                    'email_config_updated': 'bg-yellow-500',
                    'branding_updated': 'bg-pink-500',
                    'theme_updated': 'bg-purple-500',
                    'gallery_password_entry': 'bg-gray-500',
                  };
                  return colors[type] || 'bg-gray-500';
                };

                // Format activity message with translations
                const getActivityMessage = (): string => {
                  const translationKey = `admin.activities.${activity.type}`;
                  const params: Record<string, any> = {
                    eventName: activity.eventName || t('common.unknown'),
                    count: activity.metadata?.count || 0,
                    template: activity.metadata?.template_key || '',
                    categoryName: activity.metadata?.category_name || ''
                  };
                  
                  // Translate; if key missing i18n returns the key string itself
                  const translated = t(translationKey, params) as string;
                  if (!translated || translated === translationKey) {
                    // Fallback: format a readable English message
                    return adminService.formatActivityMessage(activity);
                  }
                  return translated;
                };

                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getActivityColor(activity.type)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-900 break-words">
                        {getActivityMessage()}
                      </p>
                      <p className="text-xs text-neutral-500">{activity.actorName}</p>
                      <p className="text-xs text-neutral-400 mt-1">
                        {formatDistanceToNow(parseISO(activity.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </Card>
      </div>

    </div>
  );
};

AdminDashboard.displayName = 'AdminDashboard';
