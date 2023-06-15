import MockAdapter from 'axios-mock-adapter';
import { Factory } from 'rosie';

import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { initializeMockApp } from '@edx/frontend-platform/testing';

import { initializeStore } from '../../store';
import executeThunk from '../../test-utils';
import {
  getNotificationsApiUrl, getNotificationsCountApiUrl, markAllNotificationsAsReadpiUrl, markNotificationsSeenApiUrl,
} from './api';
import {
  fetchAppsNotificationCount, fetchNotificationList, markNotificationsAsRead, markAllNotificationsAsRead,
  resetNotificationState, markNotificationsAsSeen,
} from './thunks';

import './__factories__';

const notificationCountsApiUrl = getNotificationsCountApiUrl();
const notificationsApiUrl = getNotificationsApiUrl();
const markedNotificationAsReadApiUrl = markAllNotificationsAsReadpiUrl('discussions', 1);
const markedAllNotificationsAsReadApiUrl = markAllNotificationsAsReadpiUrl('discussions');
const markedAllNotificationsAsSeenApiUrl = markNotificationsSeenApiUrl('discussions');

let axiosMock;
let store;

describe('Notification Redux', () => {
  beforeEach(async () => {
    initializeMockApp({
      authenticatedUser: {
        userId: '123abc',
        username: 'testuser',
        administrator: false,
        roles: [],
      },
    });
    axiosMock = new MockAdapter(getAuthenticatedHttpClient());
    Factory.resetAll();
    store = initializeStore();

    axiosMock.onGet(notificationCountsApiUrl).reply(200, (Factory.build('notificationsCount')));
    axiosMock.onGet(notificationsApiUrl).reply(200, (Factory.buildList('notification', 2, null)));
    await executeThunk(fetchAppsNotificationCount(), store.dispatch, store.getState);
    await executeThunk(fetchNotificationList({ page: 1, pageSize: 10 }), store.dispatch, store.getState);
  });

  afterEach(() => {
    axiosMock.reset();
  });

  it('successfully loaded initial notification states in the redux.', async () => {
    executeThunk(resetNotificationState(), store.dispatch, store.getState);

    const { notifications } = store.getState();

    expect(notifications.notificationStatus).toEqual('idle');
    expect(notifications.appName).toEqual('discussions');
    expect(notifications.appsId).toHaveLength(0);
    expect(notifications.apps).toEqual({});
    expect(notifications.notifications).toEqual({});
    expect(notifications.tabsCount).toEqual({});
    expect(notifications.showNotificationTray).toEqual(false);
    expect(notifications.pagination.count).toEqual(10);
    expect(notifications.pagination.numPages).toEqual(1);
    expect(notifications.pagination.currentPage).toEqual(1);
    expect(notifications.pagination.nextPage).toBeNull();
  });

  it('successfully loaded notifications list in the redux.', async () => {
    const state = store.getState();

    expect(Object.keys(state.notifications.notifications)).toHaveLength(2);
  });

  it('successfully loaded notification counts in the redux.', async () => {
    const { notifications: { tabsCount } } = store.getState();

    expect(tabsCount.count).toEqual(25);
    expect(tabsCount.reminders).toEqual(10);
    expect(tabsCount.discussions).toEqual(0);
    expect(tabsCount.grades).toEqual(10);
    expect(tabsCount.authoring).toEqual(5);
  });

  it('successfully loaded showNotificationTray status in the redux based on api.', async () => {
    const state = store.getState();

    expect(state.notifications.showNotificationTray).toEqual(true);
  });

  it('successfully store the count, numPages, currentPage, and nextPage data in redux.', async () => {
    const { notifications: { pagination } } = store.getState();

    expect(pagination.count).toEqual(10);
    expect(pagination.currentPage).toEqual(1);
    expect(pagination.numPages).toEqual(2);
  });

  it('successfully updated the selected app name in redux.', async () => {
    const state = store.getState();

    expect(state.notifications.appName).toEqual('discussions');
  });

  it('successfully store notification ids in the selected app in apps.', async () => {
    const state = store.getState();

    expect(state.notifications.apps.discussions).toHaveLength(2);
  });

  it('successfully marked all notifications as seen for selected app.', async () => {
    axiosMock.onPut(markedAllNotificationsAsSeenApiUrl).reply(200);
    await executeThunk(markNotificationsAsSeen('discussions'), store.dispatch, store.getState);

    expect(store.getState().notifications.notificationStatus).toEqual('successful');
  });

  it('successfully marked all notifications as read for selected app in the redux.', async () => {
    axiosMock.onPut(markedAllNotificationsAsReadApiUrl).reply(200);
    await executeThunk(markAllNotificationsAsRead('discussions'), store.dispatch, store.getState);

    const { notifications } = store.getState();
    const firstNotification = Object.values(notifications.notifications)[0];

    expect(notifications.notificationStatus).toEqual('successful');
    expect(firstNotification.lastRead).not.toBeNull();
  });

  it('successfully marked notification as read in the redux.', async () => {
    axiosMock.onPut(markedNotificationAsReadApiUrl).reply(200);
    await executeThunk(markNotificationsAsRead('discussions', 1), store.dispatch, store.getState);

    const { notifications } = store.getState();
    const firstNotification = Object.values(notifications.notifications)[0];

    expect(notifications.notificationStatus).toEqual('successful');
    expect(firstNotification.lastRead).not.toBeNull();
  });
});
