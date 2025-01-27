/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@osd/expect';
import { PIE_CHART_VIS_NAME } from '../../page_objects/dashboard_page';
import { VisualizeConstants } from '../../../../src/plugins/visualize/public/application/visualize_constants';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardVisualizations = getService('dashboardVisualizations');
  const opensearchDashboardsServer = getService('opensearchDashboardsServer');
  const listingTable = getService('listingTable');
  const PageObjects = getPageObjects([
    'dashboard',
    'header',
    'visualize',
    'discover',
    'timePicker',
    'common',
  ]);
  const dashboardName = 'Dashboard Panel Controls Test';

  describe('dashboard panel context menu', function viewEditModeTests() {
    before(async function () {
      await PageObjects.dashboard.initTests();
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.timePicker.setHistoricalDataRange();
      await dashboardAddPanel.addVisualization(PIE_CHART_VIS_NAME);
    });

    after(async function () {
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    it('are hidden in view mode', async function () {
      await PageObjects.dashboard.saveDashboard(dashboardName);

      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.expectMissingEditPanelAction();
      await dashboardPanelActions.expectMissingRemovePanelAction();
    });

    it('are shown in edit mode', async function () {
      await PageObjects.dashboard.switchToEditMode();

      const isContextMenuIconVisible = await dashboardPanelActions.isContextMenuIconVisible();
      expect(isContextMenuIconVisible).to.equal(true);

      await dashboardPanelActions.expectExistsEditPanelAction();
      await dashboardPanelActions.expectExistsClonePanelAction();
      await dashboardPanelActions.expectExistsReplacePanelAction();
      await dashboardPanelActions.expectExistsRemovePanelAction();
      await dashboardPanelActions.expectExistsToggleExpandAction();
    });

    it('are shown in edit mode after a hard refresh', async () => {
      // Based off an actual bug encountered in a PR where a hard refresh in
      // edit mode did not show the edit mode controls.
      const currentUrl = await browser.getCurrentUrl();
      // The second parameter of true will include the timestamp in the url and
      // trigger a hard refresh.
      await browser.get(currentUrl.toString(), true);
      await PageObjects.header.waitUntilLoadingHasFinished();

      await dashboardPanelActions.expectExistsEditPanelAction();
      await dashboardPanelActions.expectExistsClonePanelAction();
      await dashboardPanelActions.expectExistsReplacePanelAction();
      await dashboardPanelActions.expectExistsRemovePanelAction();

      // Get rid of the timestamp in the url.
      await browser.get(currentUrl.toString(), false);
    });

    describe('visualization object edit menu', () => {
      it('opens a visualization when edit link is clicked', async () => {
        await dashboardPanelActions.clickEdit();
        await PageObjects.header.waitUntilLoadingHasFinished();
        const currentUrl = await browser.getCurrentUrl();
        expect(currentUrl).to.contain(VisualizeConstants.EDIT_PATH);
      });

      it('deletes the visualization when delete link is clicked', async () => {
        await PageObjects.header.clickDashboard();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await dashboardPanelActions.removePanel();

        const panelCount = await PageObjects.dashboard.getPanelCount();
        expect(panelCount).to.be(0);
        // need to find the correct save
        await PageObjects.dashboard.saveDashboard(dashboardName);
      });
    });

    describe('saved search object edit menu', () => {
      const searchName = 'my search';

      before(async () => {
        await opensearchDashboardsServer.uiSettings.replace({
          'discover:v2': false,
        });
        await browser.refresh();
        await PageObjects.header.clickDiscover();
        await PageObjects.discover.clickNewSearchButton();
        await dashboardVisualizations.createSavedSearch({ name: searchName, fields: ['bytes'] });
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.header.clickDashboard();
        // Have to add steps to actually click on the dashboard; since added browser.refresh() will make
        // clickDashboard() to only land on the dashboard listing page
        // We need to add browser.refresh() so clickDiscover() lands correctly on the legacy discover page
        await listingTable.clickItemLink('dashboard', dashboardName);
        await PageObjects.header.waitUntilLoadingHasFinished();

        const inViewMode = await PageObjects.dashboard.getIsInViewMode();
        if (inViewMode) await PageObjects.dashboard.switchToEditMode();
        await dashboardAddPanel.addSavedSearch(searchName);
      });

      it('should be one panel on dashboard', async () => {
        const panelCount = await PageObjects.dashboard.getPanelCount();
        expect(panelCount).to.be(1);
      });

      it('opens a saved search when edit link is clicked', async () => {
        await dashboardPanelActions.clickEdit();
        await PageObjects.header.waitUntilLoadingHasFinished();
        const queryName = await PageObjects.discover.getCurrentQueryName();
        expect(queryName).to.be(searchName);
      });

      it('deletes the saved search when delete link is clicked', async () => {
        await PageObjects.header.clickDashboard();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await dashboardPanelActions.removePanel();

        const panelCount = await PageObjects.dashboard.getPanelCount();
        expect(panelCount).to.be(0);
      });
    });

    describe('on an expanded panel', function () {
      before('reset dashboard', async () => {
        const currentUrl = await browser.getCurrentUrl();
        await browser.get(currentUrl.toString(), false);
      });

      before('and add one panel and save to put dashboard in "view" mode', async () => {
        await dashboardAddPanel.addVisualization(PIE_CHART_VIS_NAME);
        await PageObjects.dashboard.saveDashboard(dashboardName);
      });

      before('expand panel to "full screen"', async () => {
        await dashboardPanelActions.clickExpandPanelToggle();
      });

      it('context menu actions are hidden in view mode', async function () {
        await dashboardPanelActions.expectMissingEditPanelAction();
        await dashboardPanelActions.expectMissingDuplicatePanelAction();
        await dashboardPanelActions.expectMissingReplacePanelAction();
        await dashboardPanelActions.expectMissingRemovePanelAction();
      });

      describe('in edit mode', () => {
        it('switch to edit mode', async function () {
          await PageObjects.dashboard.switchToEditMode();
        });

        it('some context menu actions should be present', async function () {
          await dashboardPanelActions.expectExistsEditPanelAction();
          await dashboardPanelActions.expectExistsClonePanelAction();
          await dashboardPanelActions.expectExistsReplacePanelAction();
        });

        it('"remove panel" action should not be present', async function () {
          await dashboardPanelActions.expectMissingRemovePanelAction();
        });
      });
    });
  });
}
